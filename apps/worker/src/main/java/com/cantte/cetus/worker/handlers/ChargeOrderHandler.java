package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.payments.ChargeRequest;
import com.cantte.cetus.payments.PaymentGateway;
import com.cantte.cetus.payments.PaymentRejectedException;
import com.cantte.cetus.payments.PaymentStatus;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.payments.PaymentTransientException;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.PaymentChargeEntity;
import com.cantte.cetus.persistence.entity.PaymentMethodEntity;
import com.cantte.cetus.worker.billing.AutoCharge;
import com.cantte.cetus.worker.billing.PaymentSettlement;
import com.cantte.cetus.worker.runner.JobContext;
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
import org.jboss.logging.Logger;

/**
 * Charges an order to the account's saved card, once per attempt. The attempt is marked SUBMITTED before Wompi is
 * called, and every run looks for the attempt's transaction before charging: Wompi takes a reference once, so a
 * charge whose answer was lost is found instead of made twice. Only then, and only if the order is still payable
 * and the account still has a card, is the card charged; the account's active card may have replaced the one the
 * attempt was scheduled with. An attempt fails only when Wompi refused it and has no transaction for it: while
 * Wompi does not answer, or answers what cannot be read, the job waits and asks again.
 */
@ApplicationScoped
public class ChargeOrderHandler implements JobHandler {

    private static final Logger LOG = Logger.getLogger(ChargeOrderHandler.class);

    private static final Duration UNCONFIGURED_DELAY = Duration.ofMinutes(30);
    /** While Wompi does not answer, or answers what cannot be read. */
    private static final Duration UNANSWERED_DELAY = Duration.ofMinutes(10);
    /** While a payment of the order's checkout is pending: the card is charged only if it does not go through. */
    private static final Duration CHECKOUT_PENDING_DELAY = Duration.ofMinutes(15);

    @Inject
    PaymentClients payments;

    @Inject
    PaymentSettlement settlement;

    @Inject
    AutoCharge autoCharge;

    @Inject
    JobContext jobContext;

    @Override
    public String type() {
        return JobTypes.CHARGE_ORDER;
    }

    @Override
    public void handle(JobEntity job) {
        PaymentGateway gateway =
                payments.gateway().orElseThrow(() -> new RetryLater(UNCONFIGURED_DELAY, "Payments are not configured"));
        Optional<Submitted> submitted = QuarkusTransaction.requiringNew().call(() -> submit(job.referenceId));
        if (submitted.isEmpty()) {
            return;
        }
        Optional<PaymentTransaction> made =
                transactions(gateway, submitted.get().charge()).stream().findFirst();
        if (made.isPresent()) {
            settlement.apply(made.get());
            return;
        }
        // A person may be paying the order through its checkout at the same time: those payments are settled first;
        // one approved leaves the card alone, and one pending makes the card wait for how it ends.
        List<PaymentTransaction> checkout =
                transactions(gateway, submitted.get().order());
        checkout.forEach(settlement::apply);
        boolean checkoutPaid =
                checkout.stream().anyMatch(transaction -> transaction.status() == PaymentStatus.APPROVED);
        if (!checkoutPaid
                && checkout.stream().anyMatch(transaction -> transaction.status() == PaymentStatus.PENDING)
                && QuarkusTransaction.requiringNew().call(() -> reschedule(job.referenceId))) {
            throw new RetryLater(CHECKOUT_PENDING_DELAY, "A payment of the order's checkout is pending");
        }
        Optional<ChargeRequest> request =
                QuarkusTransaction.requiringNew().call(() -> request(job.referenceId, checkoutPaid));
        if (request.isEmpty()) {
            return;
        }
        PaymentTransaction transaction;
        jobContext.ensureOwned();
        try {
            transaction = gateway.charge(request.get());
        } catch (PaymentTransientException e) {
            throw new RetryLater(UNANSWERED_DELAY, "Wompi did not answer the charge: " + e.getMessage());
        } catch (PaymentRejectedException e) {
            // A refusal is only final when Wompi has no transaction for the reference; otherwise its answer was lost.
            made = transactions(gateway, submitted.get().charge()).stream().findFirst();
            if (made.isEmpty()) {
                LOG.infof("Wompi refused charge %s: %s", job.referenceId, e.getMessage());
                autoCharge.refused(job.referenceId, OffsetDateTime.now());
                return;
            }
            transaction = made.get();
        }
        settlement.apply(transaction);
    }

    /**
     * Unexpected failures only, since Wompi's are retried. The attempt stays SUBMITTED, as Wompi may have made the
     * charge: the reconciliation applies its transaction, or abandons the attempt if there is none.
     */
    @Override
    public void onDead(JobEntity job, String reason) {
        LOG.warnf("Charge %s left unanswered for the reconciliation: %s", job.referenceId, reason);
    }

    /** What Wompi made for the reference; waits while Wompi cannot say. */
    private static List<PaymentTransaction> transactions(PaymentGateway gateway, String reference) {
        try {
            return gateway.transactions(reference);
        } catch (PaymentTransientException | PaymentRejectedException e) {
            throw new RetryLater(UNANSWERED_DELAY, "Wompi could not say whether it charged: " + e.getMessage());
        }
    }

    /** The references of a submitted attempt: its own, and its order's, which the order's checkout pays with. */
    private record Submitted(String charge, String order) {}

    /** Marks the attempt SUBMITTED and returns its references, unless it was answered or is no longer due. */
    private static Optional<Submitted> submit(UUID chargeId) {
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
        charge.status = PaymentChargeEntity.Status.SUBMITTED;
        return Optional.of(new Submitted(charge.reference, order.reference));
    }

    /**
     * Puts a submitted attempt back to SCHEDULED, since Wompi has no transaction for it, while its order can still be
     * paid.
     *
     * @return whether it waits to be tried again
     */
    private static boolean reschedule(UUID chargeId) {
        UUID orderId = PaymentChargeEntity.<PaymentChargeEntity>findByIdOptional(chargeId)
                .orElseThrow()
                .orderId;
        BillingOrderEntity order = BillingOrderEntity.lock(orderId).orElseThrow();
        PaymentChargeEntity charge = PaymentChargeEntity.lock(chargeId).orElseThrow();
        if (charge.status != PaymentChargeEntity.Status.SUBMITTED || !order.isPayable(OffsetDateTime.now())) {
            return false;
        }
        charge.status = PaymentChargeEntity.Status.SCHEDULED;
        return true;
    }

    /**
     * What to charge, with the account's active card, while the order can still be paid and its checkout did not
     * pay it; otherwise the attempt is canceled. Wompi has no transaction for it.
     */
    private static Optional<ChargeRequest> request(UUID chargeId, boolean checkoutPaid) {
        UUID orderId = PaymentChargeEntity.<PaymentChargeEntity>findByIdOptional(chargeId)
                .orElseThrow()
                .orderId;
        BillingOrderEntity order = BillingOrderEntity.lock(orderId).orElseThrow();
        PaymentChargeEntity charge = PaymentChargeEntity.lock(chargeId).orElseThrow();
        if (charge.status != PaymentChargeEntity.Status.SUBMITTED) {
            return Optional.empty();
        }
        Optional<PaymentMethodEntity> card = PaymentMethodEntity.findActive(order.accountId);
        boolean payable = order.isPayable(OffsetDateTime.now());
        if (!payable || card.isEmpty() || checkoutPaid) {
            charge.status = PaymentChargeEntity.Status.CANCELED;
            return Optional.empty();
        }
        charge.paymentMethodId = card.get().id;
        return Optional.of(new ChargeRequest(
                charge.reference,
                order.totalCents,
                order.currency,
                card.get().customerEmail,
                card.get().providerSourceId));
    }
}
