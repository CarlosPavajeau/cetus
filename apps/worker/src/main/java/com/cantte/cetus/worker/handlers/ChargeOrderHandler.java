package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.payments.ChargeRequest;
import com.cantte.cetus.payments.PaymentGateway;
import com.cantte.cetus.payments.PaymentRejectedException;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.PaymentChargeEntity;
import com.cantte.cetus.persistence.entity.PaymentMethodEntity;
import com.cantte.cetus.worker.billing.AutoCharge;
import com.cantte.cetus.worker.billing.PaymentSettlement;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.PaymentClients;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Charges an order to the account's saved card, once per attempt. The attempt is marked SUBMITTED before Wompi is
 * called, and a job that runs again looks for the attempt's transaction before charging: Wompi takes a reference
 * once, so a charge whose answer was lost is found instead of made twice. The order must still be pending, and the
 * card charged is the account's active one, which may have replaced the card the attempt was scheduled with.
 */
@ApplicationScoped
public class ChargeOrderHandler implements JobHandler {

    private static final Duration UNCONFIGURED_DELAY = Duration.ofMinutes(30);

    private record Submission(UUID chargeId, ChargeRequest request) {}

    @Inject
    PaymentClients payments;

    @Inject
    PaymentSettlement settlement;

    @Inject
    AutoCharge autoCharge;

    @Override
    public String type() {
        return JobTypes.CHARGE_ORDER;
    }

    @Override
    public void handle(JobEntity job) {
        PaymentGateway gateway =
                payments.gateway().orElseThrow(() -> new RetryLater(UNCONFIGURED_DELAY, "Payments are not configured"));
        Optional<Submission> submission = QuarkusTransaction.requiringNew().call(() -> claim(job.referenceId));
        if (submission.isEmpty()) {
            return;
        }
        ChargeRequest request = submission.get().request();
        PaymentTransaction transaction;
        try {
            List<PaymentTransaction> made = gateway.transactions(request.reference());
            transaction = made.isEmpty() ? gateway.charge(request) : made.getFirst();
        } catch (PaymentRejectedException e) {
            autoCharge.refused(submission.get().chargeId(), OffsetDateTime.now());
            throw new GiveUp(e.getMessage(), e);
        }
        settlement.apply(transaction);
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        autoCharge.refused(job.referenceId, OffsetDateTime.now());
    }

    /** What to send for the attempt, unless it was already answered or must not run. */
    private static Optional<Submission> claim(UUID chargeId) {
        Optional<PaymentChargeEntity> found = PaymentChargeEntity.findByIdOptional(chargeId);
        if (found.isEmpty()) {
            return Optional.empty();
        }
        BillingOrderEntity order = BillingOrderEntity.lock(found.get().orderId).orElseThrow();
        PaymentChargeEntity charge = PaymentChargeEntity.lock(chargeId).orElseThrow();
        boolean unanswered =
                charge.status == PaymentChargeEntity.Status.SUBMITTED && charge.providerTransactionId == null;
        if (charge.status != PaymentChargeEntity.Status.SCHEDULED && !unanswered) {
            return Optional.empty();
        }
        Optional<PaymentMethodEntity> method = unanswered
                ? PaymentMethodEntity.findByIdOptional(charge.paymentMethodId)
                : PaymentMethodEntity.findActive(order.accountId);
        if (!unanswered && (order.status != BillingOrderEntity.Status.PENDING || method.isEmpty())) {
            charge.status = PaymentChargeEntity.Status.CANCELED;
            return Optional.empty();
        }
        PaymentMethodEntity card = method.orElseThrow();
        charge.paymentMethodId = card.id;
        charge.status = PaymentChargeEntity.Status.SUBMITTED;
        return Optional.of(new Submission(
                charge.id,
                new ChargeRequest(
                        charge.reference,
                        order.totalCents,
                        order.currency,
                        card.customerEmail,
                        card.providerSourceId)));
    }
}
