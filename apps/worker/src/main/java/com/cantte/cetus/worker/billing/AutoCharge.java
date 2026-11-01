package com.cantte.cetus.worker.billing;

import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.notifications.Notifications;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.PaymentChargeEntity;
import com.cantte.cetus.persistence.entity.PaymentMethodEntity;
import com.cantte.cetus.worker.notifications.Dates;
import com.cantte.cetus.worker.notifications.Numbers;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Charges renewals to the account's saved card. A renewal is charged when its period closes and, while it stays
 * unpaid, again on each retry day counted from that first charge, as long as the order has not expired. Each
 * declined renewal charge tells the billing contact; one asked for from the console does not, since the person
 * sees it fail. Paying the order otherwise cancels the attempt still waiting.
 */
@ApplicationScoped
public class AutoCharge {

    private static final Logger LOG = Logger.getLogger(AutoCharge.class);

    /** What the customer reads when Wompi refuses the charge itself, without a transaction to explain it. */
    static final String REFUSED = "Wompi no aceptó el cobro con la tarjeta guardada";

    @Inject
    JobQueue jobs;

    @Inject
    Notifications notifications;

    /** Days after the renewal's first charge on which a declined one is tried again. */
    @ConfigProperty(name = "cetus.billing.charge-retry-days")
    List<Integer> retryDays;

    /**
     * Charges the renewal to the account's card now, if it has one.
     *
     * @return the card charged
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public Optional<PaymentMethodEntity> schedule(BillingOrderEntity order, OffsetDateTime now) {
        return PaymentMethodEntity.findActive(order.accountId).map(method -> {
            PaymentChargeEntity charge =
                    PaymentChargeEntity.schedule(order, method, PaymentChargeEntity.Origin.AUTO, now);
            jobs.enqueue(JobTypes.CHARGE_ORDER, charge.id);
            return method;
        });
    }

    /**
     * Records how the provider answered an attempt's transaction; the order is locked by the caller. A final
     * answer is kept: a late PENDING or a second outcome changes nothing.
     */
    void on(@Observes PaymentSettlement.ChargeSettled settled) {
        PaymentChargeEntity charge =
                PaymentChargeEntity.lock(settled.chargeId()).orElseThrow();
        if (charge.providerTransactionId == null) {
            charge.providerTransactionId = settled.transactionId();
        }
        if (charge.status != PaymentChargeEntity.Status.SUBMITTED) {
            return;
        }
        switch (settled.status()) {
            case APPROVED -> charge.status = PaymentChargeEntity.Status.APPROVED;
            case DECLINED, ERROR -> fail(charge, settled.message().orElse(null), OffsetDateTime.now());
            case PENDING, VOIDED -> {}
        }
    }

    /** A paid order needs no attempt still waiting to run. */
    void on(@Observes PaymentSettlement.OrderPaid paid) {
        PaymentChargeEntity.findLive(paid.orderId())
                .filter(charge -> charge.status == PaymentChargeEntity.Status.SCHEDULED)
                .ifPresent(charge -> charge.status = PaymentChargeEntity.Status.CANCELED);
    }

    /**
     * Wompi refused to make the attempt's transaction at all, or its job gave up: the attempt failed as a declined
     * one does.
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void refused(UUID chargeId, OffsetDateTime now) {
        UUID orderId = PaymentChargeEntity.<PaymentChargeEntity>findByIdOptional(chargeId)
                .orElseThrow()
                .orderId;
        BillingOrderEntity.lock(orderId);
        PaymentChargeEntity charge = PaymentChargeEntity.lock(chargeId).orElseThrow();
        if (charge.status == PaymentChargeEntity.Status.SUBMITTED) {
            fail(charge, REFUSED, now);
        }
    }

    /**
     * Tells the billing contact of each active card of a subscribed account that expires this month or the next,
     * or already did, once per card.
     *
     * @return notices requested now
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public int warnExpiring(OffsetDateTime now) {
        YearMonth current = YearMonth.from(now.atZoneSameInstant(Dates.BOGOTA));
        int requested = 0;
        for (PaymentMethodEntity method : PaymentMethodEntity.listExpiringBy(current.plusMonths(1))) {
            boolean expired = method.expiry().isBefore(current);
            requested += notifications
                    .request(
                            method.accountId,
                            NotificationKind.PAYMENT_METHOD_EXPIRING,
                            "payment_method_expiring:%s".formatted(method.id),
                            Map.of(
                                    "card",
                                    method.label(),
                                    "expiry",
                                    Dates.month(method.expiry()),
                                    "expired",
                                    String.valueOf(expired)))
                    .map(notice -> 1)
                    .orElse(0);
        }
        return requested;
    }

    /** The order is locked. The attempt failed no earlier than it was due, which retries count from. */
    private void fail(PaymentChargeEntity charge, String message, OffsetDateTime answeredAt) {
        OffsetDateTime now = charge.runAt.isAfter(answeredAt) ? charge.runAt : answeredAt;
        charge.status = PaymentChargeEntity.Status.FAILED;
        charge.failureMessage = message;
        // Before the retry is inserted: an order has one live attempt at most.
        PaymentChargeEntity.flush();
        BillingOrderEntity order = BillingOrderEntity.findById(charge.orderId);
        Optional<OffsetDateTime> retryAt = order.status == BillingOrderEntity.Status.PENDING
                ? retryAfter(order, now).flatMap(at -> retry(order, at, now))
                : Optional.empty();
        LOG.infof(
                "Charge %s of order %s failed; %s",
                charge.id, order.id, retryAt.map(at -> "tried again at " + at).orElse("not tried again"));
        if (charge.origin != PaymentChargeEntity.Origin.AUTO) {
            return;
        }
        PaymentMethodEntity method = PaymentMethodEntity.findById(charge.paymentMethodId);
        notifications.request(
                order.accountId,
                NotificationKind.SUBSCRIPTION_CHARGE_FAILED,
                "subscription_charge_failed:%s".formatted(charge.id),
                Map.of(
                        "plan",
                        plan(order),
                        "total",
                        Numbers.cop(order.totalCents / 100),
                        "card",
                        method.label(),
                        "reason",
                        message == null ? "" : message,
                        "retryAt",
                        retryAt.map(Dates::bogota).orElse(""),
                        "dueBy",
                        Dates.bogota(order.expiresAt),
                        "orderId",
                        order.id.toString()));
    }

    /** The next retry day after now, counted from the order's first renewal charge; none without one. */
    private Optional<OffsetDateTime> retryAfter(BillingOrderEntity order, OffsetDateTime now) {
        return PaymentChargeEntity.listByOrder(order.id).stream()
                .filter(charge -> charge.origin == PaymentChargeEntity.Origin.AUTO)
                .findFirst()
                .flatMap(first -> retryDays.stream()
                        .map(days -> first.runAt.plusDays(days))
                        .filter(at -> at.isAfter(now) && at.isBefore(order.expiresAt))
                        .min(OffsetDateTime::compareTo));
    }

    private Optional<OffsetDateTime> retry(BillingOrderEntity order, OffsetDateTime at, OffsetDateTime now) {
        return PaymentMethodEntity.findActive(order.accountId).map(method -> {
            PaymentChargeEntity charge =
                    PaymentChargeEntity.schedule(order, method, PaymentChargeEntity.Origin.AUTO, at);
            jobs.enqueue(JobTypes.CHARGE_ORDER, charge.id, Duration.between(now, at));
            return at;
        });
    }

    private static String plan(BillingOrderEntity order) {
        return BillingOrderItemEntity.listByOrder(order.id).stream()
                .filter(item -> item.itemType == BillingOrderItemEntity.Type.PLAN)
                .map(item -> item.description)
                .findFirst()
                .orElse("Cetus");
    }
}
