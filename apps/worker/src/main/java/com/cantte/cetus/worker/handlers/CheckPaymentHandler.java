package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.payments.PaymentGateway;
import com.cantte.cetus.payments.PaymentRejectedException;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.billing.PaymentSettlement;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.PaymentClients;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * Asks Wompi for every transaction of an order's reference and applies them, for the payments whose event was
 * lost or never sent, paid orders included: a lost void or a second charge only shows there. Enqueued by
 * {@code PaymentReconciliation}.
 */
@ApplicationScoped
public class CheckPaymentHandler implements JobHandler {

    private static final Duration UNCONFIGURED_DELAY = Duration.ofMinutes(30);

    @Inject
    PaymentClients payments;

    @Inject
    PaymentSettlement settlement;

    @Override
    public String type() {
        return JobTypes.CHECK_PAYMENT;
    }

    @Override
    public void handle(JobEntity job) {
        Optional<String> reference = QuarkusTransaction.requiringNew()
                .call(() -> Optional.<BillingOrderEntity>ofNullable(BillingOrderEntity.findById(job.referenceId))
                        .map(order -> order.reference));
        if (reference.isEmpty()) {
            return;
        }
        PaymentGateway gateway =
                payments.gateway().orElseThrow(() -> new RetryLater(UNCONFIGURED_DELAY, "Payments are not configured"));
        List<PaymentTransaction> transactions;
        try {
            transactions = gateway.transactions(reference.get());
        } catch (PaymentRejectedException e) {
            throw new GiveUp(e.getMessage(), e);
        }
        transactions.forEach(settlement::apply);
    }
}
