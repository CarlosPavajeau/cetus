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
 * Asks Wompi to refund an order's payment, once. The refund is marked SUBMITTED before Wompi is called and is never
 * asked again: when Wompi does not answer, or answers without a decision, the money may have gone back, and the
 * refund waits for a person to check it in Wompi's dashboard (alert REFUND_UNRESOLVED).
 */
@ApplicationScoped
public class RefundOrderHandler implements JobHandler {

    private static final Logger LOG = Logger.getLogger(RefundOrderHandler.class);

    private static final Duration UNCONFIGURED_DELAY = Duration.ofMinutes(30);

    @Inject
    PaymentClients payments;

    @Inject
    Reversals reversals;

    @Override
    public String type() {
        return JobTypes.REFUND_ORDER;
    }

    @Override
    public void handle(JobEntity job) {
        PaymentGateway gateway =
                payments.gateway().orElseThrow(() -> new RetryLater(UNCONFIGURED_DELAY, "Payments are not configured"));
        Optional<RefundRequest> request = QuarkusTransaction.requiringNew().call(() -> submit(job.referenceId));
        if (request.isEmpty()) {
            return;
        }
        Refund refund;
        try {
            refund = gateway.refund(request.get());
        } catch (PaymentTransientException e) {
            LOG.warnf(
                    "Refund %s left for a person to check: Wompi did not answer (%s)", job.referenceId, e.getMessage());
            return;
        } catch (PaymentRejectedException e) {
            LOG.infof("Wompi refused refund %s: %s", job.referenceId, e.getMessage());
            refund = new Refund(Optional.empty(), Refund.Status.DECLINED, Optional.of(e.getMessage()));
        }
        Refund answered = refund;
        QuarkusTransaction.requiringNew().run(() -> settle(job.referenceId, answered));
    }

    /** Marks the refund SUBMITTED and returns what to ask Wompi, unless it was already asked. */
    private static Optional<RefundRequest> submit(UUID reversalId) {
        Optional<PaymentReversalEntity> found = PaymentReversalEntity.findByIdOptional(reversalId);
        if (found.isEmpty()) {
            return Optional.empty();
        }
        BillingOrderEntity.lock(found.get().orderId).orElseThrow();
        PaymentReversalEntity reversal = PaymentReversalEntity.lock(reversalId).orElseThrow();
        if (reversal.status != PaymentReversalEntity.Status.REQUESTED
                || reversal.mode != PaymentReversalEntity.Mode.WOMPI) {
            return Optional.empty();
        }
        reversal.status = PaymentReversalEntity.Status.SUBMITTED;
        return Optional.of(new RefundRequest(
                reversal.providerTransactionId, reversal.amountCents, reversal.reason, reversal.reference));
    }

    private void settle(UUID reversalId, Refund refund) {
        PaymentReversalEntity found = PaymentReversalEntity.<PaymentReversalEntity>findByIdOptional(reversalId)
                .orElseThrow();
        BillingOrderEntity order = BillingOrderEntity.lock(found.orderId).orElseThrow();
        PaymentReversalEntity reversal = PaymentReversalEntity.lock(reversalId).orElseThrow();
        if (reversal.status != PaymentReversalEntity.Status.SUBMITTED) {
            return;
        }
        reversal.providerRefundId = refund.id().orElse(reversal.providerRefundId);
        reversal.failureMessage =
                refund.message().filter(message -> !message.isBlank()).orElse(null);
        if (refund.status() == Refund.Status.APPROVED) {
            reversals.approve(order, reversal, OffsetDateTime.now());
        } else if (refund.status().isFailed()) {
            reversal.status = PaymentReversalEntity.Status.FAILED;
            LOG.infof("Refund %s of order %s failed (%s)", reversal.id, order.id, refund.status());
        } else {
            LOG.warnf("Refund %s of order %s left for a person to check: Wompi has not decided", reversal.id, order.id);
        }
    }
}
