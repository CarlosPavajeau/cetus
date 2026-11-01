package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.payments.PaymentGateway;
import com.cantte.cetus.payments.PaymentRejectedException;
import com.cantte.cetus.payments.PaymentTransientException;
import com.cantte.cetus.payments.Refund;
import com.cantte.cetus.payments.RefundRequest;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.PaymentReversalEntity;
import com.cantte.cetus.worker.billing.Reversals;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.PaymentClients;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * Asks Wompi to refund an order's payment, once, and follows it until Wompi decides. The refund is marked SUBMITTED
 * before Wompi is called and is never asked again. Wompi answers it PENDING and decides seconds later, so the job
 * runs again and asks for the refund by its id until it is approved or fails: every minute for the first hour,
 * then every half hour. When Wompi does not answer the
 * request, or answers without an id, the money may have gone back and the refund waits for a person to check it
 * in Wompi's dashboard (alert REFUND_UNRESOLVED).
 */
@ApplicationScoped
public class RefundOrderHandler implements JobHandler {

    private static final Logger LOG = Logger.getLogger(RefundOrderHandler.class);

    private static final Duration UNCONFIGURED_DELAY = Duration.ofMinutes(30);
    /** Between two looks at a refund Wompi has not decided yet, while it is recent. */
    private static final Duration UNDECIDED_DELAY = Duration.ofMinutes(1);
    /** Between two looks at one still undecided after {@link #UNDECIDED_RECENT}; a person is alerted by then. */
    private static final Duration UNDECIDED_LATE_DELAY = Duration.ofMinutes(30);

    private static final Duration UNDECIDED_RECENT = Duration.ofHours(1);

    @Inject
    PaymentClients payments;

    @Inject
    Reversals reversals;

    /** What the run does with the refund. */
    private sealed interface Step {}

    private record Ask(RefundRequest request) implements Step {}

    private record Follow(String refundId) implements Step {}

    private record Nothing() implements Step {}

    @Override
    public String type() {
        return JobTypes.REFUND_ORDER;
    }

    @Override
    public void handle(JobEntity job) {
        PaymentGateway gateway =
                payments.gateway().orElseThrow(() -> new RetryLater(UNCONFIGURED_DELAY, "Payments are not configured"));
        Step step = QuarkusTransaction.requiringNew().call(() -> claim(job.referenceId));
        Refund refund;
        switch (step) {
            case Nothing nothing -> {
                return;
            }
            case Ask ask -> {
                try {
                    refund = gateway.refund(ask.request());
                } catch (PaymentTransientException e) {
                    LOG.warnf(
                            "Refund %s left for a person to check: Wompi did not answer (%s)",
                            job.referenceId, e.getMessage());
                    return;
                } catch (PaymentRejectedException e) {
                    LOG.infof("Wompi refused refund %s: %s", job.referenceId, e.getMessage());
                    refund = new Refund(Optional.empty(), Refund.Status.DECLINED, Optional.of(e.getMessage()));
                }
            }
            case Follow follow -> {
                Optional<Refund> found;
                try {
                    found = gateway.refundOf(follow.refundId());
                } catch (PaymentTransientException | PaymentRejectedException e) {
                    throw new RetryLater(
                            UNDECIDED_DELAY, "Wompi could not say how the refund ended: " + e.getMessage());
                }
                if (found.isEmpty()) {
                    LOG.warnf("Refund %s left for a person to check: Wompi does not know it", job.referenceId);
                    return;
                }
                refund = found.get();
            }
        }
        Refund answered = refund;
        Optional<Duration> next = QuarkusTransaction.requiringNew().call(() -> settle(job.referenceId, answered));
        if (next.isPresent()) {
            throw new RetryLater(next.get(), "Wompi has not decided the refund yet");
        }
    }

    /**
     * Marks a requested refund SUBMITTED and returns what to ask Wompi; a submitted one with Wompi's id is followed;
     * any other is left alone.
     */
    private static Step claim(UUID reversalId) {
        Optional<PaymentReversalEntity> found = PaymentReversalEntity.findByIdOptional(reversalId);
        if (found.isEmpty()) {
            return new Nothing();
        }
        BillingOrderEntity.lock(found.get().orderId).orElseThrow();
        PaymentReversalEntity reversal = PaymentReversalEntity.lock(reversalId).orElseThrow();
        if (reversal.mode != PaymentReversalEntity.Mode.WOMPI) {
            return new Nothing();
        }
        if (reversal.status == PaymentReversalEntity.Status.SUBMITTED && reversal.providerRefundId != null) {
            return new Follow(reversal.providerRefundId);
        }
        if (reversal.status != PaymentReversalEntity.Status.REQUESTED) {
            return new Nothing();
        }
        reversal.status = PaymentReversalEntity.Status.SUBMITTED;
        return new Ask(new RefundRequest(
                reversal.providerTransactionId, reversal.amountCents, reversal.reason, reversal.reference));
    }

    /** @return when to look again, while Wompi has not decided and the refund can be followed by its id */
    private Optional<Duration> settle(UUID reversalId, Refund refund) {
        PaymentReversalEntity found = PaymentReversalEntity.<PaymentReversalEntity>findByIdOptional(reversalId)
                .orElseThrow();
        BillingOrderEntity order = BillingOrderEntity.lock(found.orderId).orElseThrow();
        PaymentReversalEntity reversal = PaymentReversalEntity.lock(reversalId).orElseThrow();
        if (reversal.status != PaymentReversalEntity.Status.SUBMITTED) {
            return Optional.empty();
        }
        reversal.providerRefundId = refund.id().orElse(reversal.providerRefundId);
        reversal.failureMessage =
                refund.message().filter(message -> !message.isBlank()).orElse(null);
        if (refund.status() == Refund.Status.APPROVED) {
            reversals.approve(order, reversal, OffsetDateTime.now());
            return Optional.empty();
        }
        if (refund.status().isFailed()) {
            reversal.status = PaymentReversalEntity.Status.FAILED;
            LOG.infof("Refund %s of order %s failed (%s)", reversal.id, order.id, refund.status());
            return Optional.empty();
        }
        if (reversal.providerRefundId == null) {
            LOG.warnf("Refund %s of order %s left for a person to check: Wompi gave no id", reversal.id, order.id);
            return Optional.empty();
        }
        boolean recent = reversal.createdAt.isAfter(OffsetDateTime.now().minus(UNDECIDED_RECENT));
        return Optional.of(recent ? UNDECIDED_DELAY : UNDECIDED_LATE_DELAY);
    }
}
