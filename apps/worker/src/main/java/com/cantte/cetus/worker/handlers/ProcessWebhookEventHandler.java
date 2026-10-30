package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.payments.PaymentGateway;
import com.cantte.cetus.payments.PaymentRejectedException;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity.Status;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.billing.PaymentSettlement;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.PaymentClients;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Acts on an event a provider sent, stored by the API once its signature was checked. A Wompi event only names
 * the transaction: its status and amount come from asking Wompi, so a replayed or reordered event changes
 * nothing that Wompi does not confirm.
 */
@ApplicationScoped
public class ProcessWebhookEventHandler implements JobHandler {

    static final String TRANSACTION_UPDATED = "transaction.updated";
    /** How long events wait for the Wompi keys to be set. */
    private static final Duration UNCONFIGURED_DELAY = Duration.ofMinutes(30);

    record Received(UUID id, InboundWebhookEventEntity.Provider provider, String type, String payload) {}

    private record Result(Status status, String note) {}

    @Inject
    PaymentClients payments;

    @Inject
    PaymentSettlement settlement;

    @Inject
    ObjectMapper json;

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
            case RESEND -> throw new GiveUp("Resend events are still processed by the API");
        };
        finish(job.referenceId, result.status(), result.note());
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        finish(job.referenceId, Status.FAILED, reason);
    }

    private Result wompi(Received event) throws IOException {
        if (!TRANSACTION_UPDATED.equals(event.type())) {
            return new Result(Status.IGNORED, "Not about a transaction");
        }
        JsonNode id =
                json.readTree(event.payload()).path("data").path("transaction").path("id");
        if (!id.isValueNode() || id.asText().isBlank()) {
            throw new GiveUp("The event names no transaction");
        }
        PaymentGateway gateway =
                payments.gateway().orElseThrow(() -> new RetryLater(UNCONFIGURED_DELAY, "Payments are not configured"));
        Optional<PaymentTransaction> transaction;
        try {
            transaction = gateway.transaction(id.asText());
        } catch (PaymentRejectedException e) {
            throw new GiveUp(e.getMessage(), e);
        }
        if (transaction.isEmpty()) {
            return new Result(Status.IGNORED, "Wompi does not know the transaction");
        }
        return switch (settlement.apply(transaction.get())) {
            case UNKNOWN_ORDER -> new Result(Status.IGNORED, "No order has the reference");
            case PAID, ALREADY_PAID, REVIEW, RECORDED -> new Result(Status.PROCESSED, null);
        };
    }

    /** The event, unless it was already processed; counts the attempt. */
    private static Optional<Received> start(UUID eventId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            InboundWebhookEventEntity event = InboundWebhookEventEntity.findById(eventId);
            if (event == null || event.status != Status.RECEIVED) {
                return Optional.empty();
            }
            event.attempts++;
            return Optional.of(new Received(event.id, event.provider, event.eventType, event.payload));
        });
    }

    private static void finish(UUID eventId, Status status, String note) {
        QuarkusTransaction.requiringNew().run(() -> {
            InboundWebhookEventEntity event = InboundWebhookEventEntity.findById(eventId);
            if (event != null) {
                event.status = status;
                event.error = note;
                event.processedAt = OffsetDateTime.now();
            }
        });
    }
}
