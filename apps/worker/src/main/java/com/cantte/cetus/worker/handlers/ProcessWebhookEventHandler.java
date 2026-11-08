package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.payments.EventCheck;
import com.cantte.cetus.payments.PaymentEvent;
import com.cantte.cetus.payments.PaymentGateway;
import com.cantte.cetus.payments.PaymentRejectedException;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity.Status;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.billing.PaymentSettlement;
import com.cantte.cetus.worker.delivery.EmailEvents;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.PaymentClients;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import java.io.IOException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Acts on an event a provider sent, stored by the API once its signature was checked. A Resend event moves the
 * delivery of its email. A Wompi event only names the transaction: its status and amount come from asking Wompi, so a replayed or reordered event changes
 * nothing that Wompi does not confirm.
 */
@ApplicationScoped
public class ProcessWebhookEventHandler implements JobHandler {

    /** How long events wait for the Wompi keys to be set. */
    private static final Duration UNCONFIGURED_DELAY = Duration.ofMinutes(30);

    /**
     * How long an event of an email no delivery has yet keeps trying: Resend can report it before the worker
     * records the message id it got back.
     */
    public static final Duration UNMATCHED_WAIT = Duration.ofMinutes(2);

    private static final Duration UNMATCHED_DELAY = Duration.ofSeconds(20);

    record Received(
            UUID id,
            InboundWebhookEventEntity.Provider provider,
            String type,
            String payload,
            OffsetDateTime receivedAt) {}

    private record Result(Status status, String note) {}

    @Inject
    PaymentClients payments;

    @Inject
    PaymentSettlement settlement;

    @Inject
    EmailEvents emails;

    @Override
    public String type() {
        return JobTypes.PROCESS_WEBHOOK_EVENT;
    }

    @Override
    public void handle(JobEntity job) throws IOException {
        Optional<Received> received = start(job.referenceId);
        if (received.isEmpty()) {
            return;
        }
        Result result = switch (received.get().provider()) {
            case WOMPI -> wompi(received.get());
            case RESEND -> resend(received.get());
        };
        finish(job.referenceId, result.status(), result.note());
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        finish(job.referenceId, Status.FAILED, reason);
    }

    private Result resend(Received event) throws IOException {
        return switch (emails.apply(event.payload())) {
            case APPLIED -> new Result(Status.PROCESSED, null);
            case UNTRACKED -> new Result(Status.IGNORED, "Not about a delivery");
            case NO_DELIVERY -> {
                if (event.receivedAt().plus(UNMATCHED_WAIT).isAfter(OffsetDateTime.now())) {
                    throw new RetryLater(UNMATCHED_DELAY, "No delivery has the email yet");
                }
                yield new Result(Status.IGNORED, "No delivery sent the email");
            }
        };
    }

    /**
     * The stored event is checked again and only its signed values are used: the checksum covers the values, not
     * the rest of the body.
     */
    private Result wompi(Received event) {
        PaymentGateway gateway =
                payments.gateway().orElseThrow(() -> new RetryLater(UNCONFIGURED_DELAY, "Payments are not configured"));
        if (!(gateway.verifyEvent(event.payload()) instanceof EventCheck.Verified(PaymentEvent verified))) {
            throw new GiveUp("The stored event no longer verifies with the events secret");
        }
        if (verified.transactionId().isEmpty()) {
            return new Result(Status.IGNORED, "Not about a transaction");
        }
        Optional<PaymentTransaction> transaction;
        try {
            transaction = gateway.transaction(verified.transactionId().get());
        } catch (PaymentRejectedException e) {
            throw new GiveUp(e.getMessage(), e);
        }
        if (transaction.isEmpty()) {
            return new Result(Status.IGNORED, "Wompi does not know the transaction");
        }
        return switch (settlement.apply(transaction.get())) {
            case UNKNOWN_ORDER -> new Result(Status.IGNORED, "No order has the reference");
            case PAID, ALREADY_PAID, REVIEW, RECORDED, CHARGED_BACK, RETURNED -> new Result(Status.PROCESSED, null);
        };
    }

    /** The event, unless it was already processed; counts the attempt on the locked row. */
    private static Optional<Received> start(UUID eventId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            InboundWebhookEventEntity event =
                    InboundWebhookEventEntity.findById(eventId, LockModeType.PESSIMISTIC_WRITE);
            if (event == null || event.status != Status.RECEIVED) {
                return Optional.empty();
            }
            event.attempts++;
            return Optional.of(
                    new Received(event.id, event.provider, event.eventType, event.payload, event.receivedAt));
        });
    }

    /** Only a received event is resolved: one another run already processed keeps its outcome. */
    private static void finish(UUID eventId, Status status, String note) {
        QuarkusTransaction.requiringNew()
                .run(() -> InboundWebhookEventEntity.update(
                        "status = ?1, error = ?2, processedAt = ?3 where id = ?4 and status = ?5",
                        status,
                        note,
                        OffsetDateTime.now(),
                        eventId,
                        Status.RECEIVED));
    }
}
