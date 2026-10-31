package com.cantte.cetus.worker.billing;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.notifications.Notifications;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.BillingProfileEntity;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionPeriodEntity;
import com.cantte.cetus.worker.notifications.Dates;
import com.cantte.cetus.worker.notifications.Numbers;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * The life of a subscription. Paying its first order starts it with its first period and lot; closing a period
 * bills the overage its DIAN accepted and opens the next one with the order that renews it, unpaid until the
 * customer pays it (PAST_DUE, which still issues); paying that order grants the period's lot. A renewal unpaid
 * after the grace days cancels it. Each step locks what it changes and checks it was not done, so running it again
 * does nothing.
 */
@ApplicationScoped
public class Subscriptions {

    private static final Logger LOG = Logger.getLogger(Subscriptions.class);

    @Inject
    CreditLedger ledger;

    @Inject
    Notifications notifications;

    @Inject
    AuditLog auditLog;

    /** How long a renewal waits to be paid before the subscription is canceled. */
    @ConfigProperty(name = "cetus.billing.subscription-grace")
    Duration grace;

    /** Days into the grace when the billing contact is reminded of the unpaid renewal. */
    @ConfigProperty(name = "cetus.billing.subscription-reminder-days")
    List<Integer> reminderDays;

    /** A new subscription's overage limit, in monthly fees. */
    @ConfigProperty(name = "cetus.billing.subscription-overage-limit-quotas")
    int overageLimitQuotas;

    /** How long a period's documents last after the period ends. */
    @ConfigProperty(name = "cetus.billing.subscription-carry-over")
    Duration carryOver;

    /** The most unused subscription documents, in monthly quotas, a new period's lot leaves in force. */
    @ConfigProperty(name = "cetus.billing.subscription-carry-quotas")
    int carryQuotas;

    void on(@Observes PaymentSettlement.OrderPaid paid) {
        BillingOrderEntity order = BillingOrderEntity.<BillingOrderEntity>findByIdOptional(paid.orderId())
                .orElseThrow();
        switch (order.kind) {
            case PURCHASE -> {
                for (BillingOrderItemEntity item : BillingOrderItemEntity.listByOrder(order.id)) {
                    if (item.itemType != BillingOrderItemEntity.Type.PLAN) {
                        continue;
                    }
                    PlanVersionEntity version = PlanVersionEntity.findById(item.planVersionId);
                    PlanEntity plan = PlanEntity.findById(version.planId);
                    if (plan.kind == PlanEntity.Kind.SUBSCRIPTION) {
                        start(order, version, plan);
                    }
                }
            }
            case RENEWAL ->
                SubscriptionPeriodEntity.findByOpeningOrder(order.id).ifPresent(period -> renew(order, period));
            case MANUAL -> {}
        }
    }

    private void start(BillingOrderEntity order, PlanVersionEntity version, PlanEntity plan) {
        if (SubscriptionEntity.lockCurrent(order.accountId).isPresent()) {
            PaymentSettlement.review(
                    order, "La cuenta ya tenía una suscripción al pagarse la orden de %s".formatted(plan.name));
            return;
        }
        SubscriptionEntity subscription = new SubscriptionEntity();
        subscription.id = Ids.newId();
        subscription.accountId = order.accountId;
        subscription.planVersionId = version.id;
        subscription.status = SubscriptionEntity.Status.ACTIVE;
        subscription.overageLimitCents = version.priceCents * overageLimitQuotas;
        subscription.startedAt = order.paidAt;
        subscription.persist();
        SubscriptionPeriodEntity period = open(subscription, 1, version.id, order.paidAt);
        period.openingOrderId = order.id;
        grant(subscription, period, version);
        auditLog.record(
                order.accountId,
                Actor.system(),
                null,
                AuditAction.SUBSCRIPTION_STARTED,
                "subscription",
                subscription.id,
                Map.of("plan", plan.code, "version", version.version, "reference", order.reference));
    }

    private void renew(BillingOrderEntity order, SubscriptionPeriodEntity period) {
        SubscriptionEntity subscription =
                SubscriptionEntity.lock(period.subscriptionId).orElseThrow();
        if (subscription.status == SubscriptionEntity.Status.CANCELED) {
            PaymentSettlement.review(
                    order, "Se pagó la renovación de una suscripción ya cancelada; el periodo no se otorgó");
            return;
        }
        if (period.grantId != null) {
            return;
        }
        grant(subscription, period, PlanVersionEntity.findById(period.planVersionId));
        if (period.status == SubscriptionPeriodEntity.Status.OPEN) {
            subscription.status = SubscriptionEntity.Status.ACTIVE;
            subscription.pastDueAt = null;
        }
    }

    /** The period's lot, after which the subscription's unused documents above the cap expire. */
    private void grant(SubscriptionEntity subscription, SubscriptionPeriodEntity period, PlanVersionEntity version) {
        OffsetDateTime now = OffsetDateTime.now();
        ledger.grant(
                        subscription.accountId,
                        new CreditLedger.Source(CreditGrantEntity.SourceType.SUBSCRIPTION_PERIOD, period.id),
                        version.id,
                        version.documentsIncluded,
                        period.endsAt.plus(carryOver),
                        Actor.system(),
                        null)
                .ifPresent(lot -> period.grantId = lot.id);
        ledger.capSubscription(subscription.accountId, version.documentsIncluded * carryQuotas, now);
    }

    /**
     * Closes the period if it ended: bills its overage and, unless the subscription ends with it (canceled by its
     * owner, or still unpaid), opens the next one with the order that renews it.
     *
     * @return whether it closed now
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public boolean close(UUID periodId, OffsetDateTime now) {
        SubscriptionPeriodEntity period =
                SubscriptionPeriodEntity.lock(periodId).orElseThrow();
        if (period.status == SubscriptionPeriodEntity.Status.CLOSED || period.endsAt.isAfter(now)) {
            return false;
        }
        SubscriptionEntity subscription =
                SubscriptionEntity.lock(period.subscriptionId).orElseThrow();
        if (subscription.status == SubscriptionEntity.Status.PAST_DUE) {
            // The period ended with its own renewal unpaid: it is not renewed again over an unpaid one.
            finish(subscription, period, now);
            cancel(subscription, now, "UNPAID");
            return true;
        }
        if (subscription.cancelAtPeriodEnd) {
            finish(subscription, period, now);
            cancel(subscription, now, "REQUESTED");
            return true;
        }
        BillingProfileEntity profile = profile(subscription.accountId);
        PlanVersionEntity versionClosed = PlanVersionEntity.findById(period.planVersionId);
        int overage = bill(subscription, period, now);
        UUID versionNextId =
                subscription.nextPlanVersionId == null ? subscription.planVersionId : subscription.nextPlanVersionId;
        PlanVersionEntity versionNext = PlanVersionEntity.findById(versionNextId);
        PlanEntity planNext = PlanEntity.findById(versionNext.planId);
        SubscriptionPeriodEntity next = open(subscription, period.number + 1, versionNext.id, period.endsAt);

        BillingOrderEntity order = BillingOrderEntity.open(
                subscription.accountId, BillingOrderEntity.Kind.RENEWAL, profile, now.plus(grace));
        BillingOrderItemEntity.add(
                order,
                BillingOrderItemEntity.Type.PLAN,
                versionNext.id,
                next.id,
                planNext.name,
                1,
                versionNext.priceCents,
                versionNext.taxIncluded,
                versionNext.taxRate);
        overageItem(order, period, versionClosed, overage);
        period.closingOrderId = order.id;
        next.openingOrderId = order.id;

        subscription.planVersionId = versionNext.id;
        subscription.nextPlanVersionId = null;
        subscription.status = SubscriptionEntity.Status.PAST_DUE;
        subscription.pastDueAt = now;
        notifications.request(
                subscription.accountId,
                NotificationKind.SUBSCRIPTION_RENEWAL,
                "subscription_renewal:%s".formatted(next.id),
                Map.of(
                        "plan", planNext.name,
                        "periodEnd", Dates.bogota(next.endsAt),
                        "total", Numbers.cop(order.totalCents / 100),
                        "overage", Numbers.count(overage),
                        "dueBy", Dates.bogota(order.expiresAt),
                        "orderId", order.id.toString()));
        return true;
    }

    /**
     * Cancels the subscription if its renewal went unpaid through the grace: its open period closes with its
     * overage billed in an order of its own.
     *
     * @return whether it was canceled now
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public boolean lapse(UUID subscriptionId, OffsetDateTime now) {
        SubscriptionEntity subscription =
                SubscriptionEntity.lock(subscriptionId).orElseThrow();
        if (subscription.status != SubscriptionEntity.Status.PAST_DUE
                || subscription.pastDueAt.plus(grace).isAfter(now)) {
            return false;
        }
        SubscriptionPeriodEntity period = SubscriptionPeriodEntity.findOpen(subscription.id)
                .flatMap(open -> SubscriptionPeriodEntity.lock(open.id))
                .orElseThrow(() -> new IllegalStateException(
                        "Subscription " + subscription.id + " is past due without an open period"));
        finish(subscription, period, now);
        cancel(subscription, now, "UNPAID");
        return true;
    }

    /**
     * Reminds the billing contact of an unpaid renewal on each reminder day of the grace, once per period and day.
     *
     * @return reminders requested now
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public int remind(UUID subscriptionId, OffsetDateTime now) {
        SubscriptionEntity subscription = SubscriptionEntity.findById(subscriptionId);
        if (subscription.status != SubscriptionEntity.Status.PAST_DUE) {
            return 0;
        }
        Optional<Integer> day = reminderDays.reversed().stream()
                .filter(days -> !subscription.pastDueAt.plusDays(days).isAfter(now))
                .findFirst();
        if (day.isEmpty()) {
            return 0;
        }
        SubscriptionPeriodEntity period =
                SubscriptionPeriodEntity.findOpen(subscription.id).orElseThrow();
        BillingOrderEntity order = BillingOrderEntity.findById(period.openingOrderId);
        PlanVersionEntity version = PlanVersionEntity.findById(period.planVersionId);
        PlanEntity plan = PlanEntity.findById(version.planId);
        return notifications
                .request(
                        subscription.accountId,
                        NotificationKind.SUBSCRIPTION_PAST_DUE,
                        "subscription_past_due:%s:%d".formatted(period.id, day.get()),
                        Map.of(
                                "plan", plan.name,
                                "total", Numbers.cop(order.totalCents / 100),
                                "dueBy", Dates.bogota(subscription.pastDueAt.plus(grace)),
                                "orderId", order.id.toString()))
                .map(notice -> 1)
                .orElse(0);
    }

    /** Closes the subscription's last period, with its overage billed in an order of its own when it has any. */
    private void finish(SubscriptionEntity subscription, SubscriptionPeriodEntity period, OffsetDateTime now) {
        int overage = bill(subscription, period, now);
        if (overage == 0) {
            return;
        }
        BillingOrderEntity order = BillingOrderEntity.open(
                subscription.accountId,
                BillingOrderEntity.Kind.RENEWAL,
                profile(subscription.accountId),
                now.plus(grace));
        overageItem(order, period, PlanVersionEntity.findById(period.planVersionId), overage);
        period.closingOrderId = order.id;
    }

    private void cancel(SubscriptionEntity subscription, OffsetDateTime now, String reason) {
        PlanVersionEntity version = PlanVersionEntity.findById(subscription.planVersionId);
        PlanEntity plan = PlanEntity.findById(version.planId);
        subscription.status = SubscriptionEntity.Status.CANCELED;
        subscription.canceledAt = now;
        subscription.pastDueAt = null;
        subscription.nextPlanVersionId = null;
        auditLog.record(
                subscription.accountId,
                Actor.system(),
                null,
                AuditAction.SUBSCRIPTION_CANCELED,
                "subscription",
                subscription.id,
                Map.of("plan", plan.code, "reason", reason));
        notifications.request(
                subscription.accountId,
                NotificationKind.SUBSCRIPTION_CANCELED,
                "subscription_canceled:%s".formatted(subscription.id),
                Map.of("plan", plan.name, "canceledAt", Dates.bogota(now), "reason", reason));
        LOG.infof("Subscription %s was canceled (%s)", subscription.id, reason);
    }

    /** Closes the period, billing its accepted overage documents once. */
    private int bill(SubscriptionEntity subscription, SubscriptionPeriodEntity period, OffsetDateTime now) {
        int overage = ledger.billOverage(subscription.accountId, period.id);
        period.status = SubscriptionPeriodEntity.Status.CLOSED;
        period.closedAt = now;
        period.overageQuantity = overage;
        // Before the next period is inserted: a subscription has one open period at most.
        SubscriptionPeriodEntity.flush();
        return overage;
    }

    private static void overageItem(
            BillingOrderEntity order, SubscriptionPeriodEntity period, PlanVersionEntity version, int overage) {
        if (overage == 0) {
            return;
        }
        PlanEntity plan = PlanEntity.findById(version.planId);
        BillingOrderItemEntity.add(
                order,
                BillingOrderItemEntity.Type.OVERAGE,
                null,
                period.id,
                "Excedente de " + plan.name,
                overage,
                version.priceOverageCents,
                version.taxIncluded,
                version.taxRate);
    }

    private static SubscriptionPeriodEntity open(
            SubscriptionEntity subscription, int number, UUID versionId, OffsetDateTime startsAt) {
        SubscriptionPeriodEntity period = new SubscriptionPeriodEntity();
        period.id = Ids.newId();
        period.subscriptionId = subscription.id;
        period.number = number;
        period.planVersionId = versionId;
        period.startsAt = startsAt;
        // From the start, so a subscription started on the 31st keeps its day where the month has it.
        period.endsAt = subscription.startedAt.plusMonths(number);
        period.status = SubscriptionPeriodEntity.Status.OPEN;
        period.persist();
        return period;
    }

    private static BillingProfileEntity profile(UUID accountId) {
        BillingProfileEntity profile = BillingProfileEntity.findById(accountId);
        if (profile == null) {
            throw new IllegalStateException("Subscribed account " + accountId + " has no billing profile");
        }
        return profile;
    }
}
