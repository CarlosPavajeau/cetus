package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.payments.PaymentGateway;
import com.cantte.cetus.payments.PaymentRejectedException;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.PaymentChargeEntity;
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
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

/**
 * Asks Wompi for every transaction of an order's reference, and of each of its charges to a saved card, and applies
 * them, for the payments whose event was lost or never sent, paid orders included: a lost void or a second charge
 * only shows there. A charge to the card left unanswered by a job that died, and of which Wompi has no transaction,
 * was never made: it is abandoned so the order can be paid again. Enqueued by {@code PaymentReconciliation}.
 */
@ApplicationScoped
public class CheckPaymentHandler implements JobHandler {

    private static final Duration UNCONFIGURED_DELAY = Duration.ofMinutes(30);

    @Inject
    PaymentClients payments;

    @Inject
    PaymentSettlement settlement;

    @Inject
    AutoCharge autoCharge;

    @Override
    public String type() {
        return JobTypes.CHECK_PAYMENT;
    }

    @Override
    public void handle(JobEntity job) {
        List<String> references = QuarkusTransaction.requiringNew()
                .call(() -> Optional.<BillingOrderEntity>ofNullable(BillingOrderEntity.findById(job.referenceId))
                        .map(order -> Stream.concat(
                                        Stream.of(order.reference),
                                        PaymentChargeEntity.listByOrder(order.id).stream()
                                                .map(charge -> charge.reference))
                                .toList())
                        .orElse(List.of()));
        if (references.isEmpty()) {
            return;
        }
        PaymentGateway gateway =
                payments.gateway().orElseThrow(() -> new RetryLater(UNCONFIGURED_DELAY, "Payments are not configured"));
        List<PaymentTransaction> transactions = new ArrayList<>();
        Set<String> unknown = new HashSet<>();
        try {
            for (String reference : references) {
                List<PaymentTransaction> found = gateway.transactions(reference);
                if (found.isEmpty()) {
                    unknown.add(reference);
                }
                transactions.addAll(found);
            }
        } catch (PaymentRejectedException e) {
            throw new GiveUp(e.getMessage(), e);
        }
        transactions.forEach(settlement::apply);
        autoCharge.abandon(job.referenceId, unknown);
    }
}
