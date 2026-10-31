package com.cantte.cetus.api.billing;

import com.cantte.cetus.api.billing.BillingViews.PlanVersionView;
import com.cantte.cetus.api.billing.BillingViews.SubscriptionPeriodView;
import com.cantte.cetus.api.billing.BillingViews.SubscriptionView;
import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.billing.OverageLimit;
import com.cantte.cetus.domain.billing.Price;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.audit.RequestOrigin;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionPeriodEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * The account's subscription as its members see it, and what its owners and admins change of it: the overage
 * limit, the plan of the next period and whether it ends with the open one. The worker starts, renews and closes
 * it; nothing here charges.
 */
@ApplicationScoped
public class AccountSubscription {

    @Inject
    CreditLedger ledger;

    @Inject
    PlanCatalog catalog;

    @Inject
    AuditLog auditLog;

    @Transactional(Transactional.TxType.MANDATORY)
    public SubscriptionView of(UUID accountId) {
        SubscriptionEntity subscription = SubscriptionEntity.findCurrent(accountId)
                .orElseThrow(() -> new NotFoundException("The account has no subscription"));
        return view(subscription);
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public SubscriptionView overageLimit(UUID accountId, long overageLimitCents, Actor actor, RequestOrigin origin) {
        SubscriptionEntity subscription = locked(accountId);
        long previous = subscription.overageLimitCents;
        subscription.overageLimitCents = overageLimitCents;
        auditLog.record(
                accountId,
                actor,
                origin,
                AuditAction.SUBSCRIPTION_OVERAGE_LIMIT_CHANGED,
                "subscription",
                subscription.id,
                Map.of("overageLimitCents", overageLimitCents, "overageLimitCentsPrevious", previous));
        return view(subscription);
    }

    /** Schedules the plan of the next period, or undoes the change with null. */
    @Transactional(Transactional.TxType.MANDATORY)
    public SubscriptionView planNext(UUID accountId, UUID planVersionId, Actor actor, RequestOrigin origin) {
        SubscriptionEntity subscription = locked(accountId);
        if (subscription.cancelAtPeriodEnd) {
            throw new DomainException(
                    "subscription_ending",
                    "The subscription ends with this period; resume it before changing its plan");
        }
        Map<String, Object> data = new HashMap<>();
        if (planVersionId == null || planVersionId.equals(subscription.planVersionId)) {
            subscription.nextPlanVersionId = null;
            data.put("plan", plan(subscription.planVersionId).code);
        } else {
            boolean offered = catalog.offers(accountId).stream()
                    .anyMatch(offer -> offer.kind() == PlanEntity.Kind.SUBSCRIPTION
                            && offer.version() != null
                            && offer.version().id().equals(planVersionId)
                            && offer.version().priceCents() > 0);
            if (!offered) {
                throw new DomainException(
                        "plan_version_not_offered",
                        "That subscription version is not offered to this account now; reload the catalog");
            }
            subscription.nextPlanVersionId = planVersionId;
            data.put("plan", plan(planVersionId).code);
        }
        data.put("planPrevious", plan(subscription.planVersionId).code);
        auditLog.record(
                accountId,
                actor,
                origin,
                AuditAction.SUBSCRIPTION_PLAN_SCHEDULED,
                "subscription",
                subscription.id,
                data);
        return view(subscription);
    }

    /** Ends the subscription with the open period, or, with false, keeps it renewing. */
    @Transactional(Transactional.TxType.MANDATORY)
    public SubscriptionView cancelAtPeriodEnd(UUID accountId, boolean cancel, Actor actor, RequestOrigin origin) {
        SubscriptionEntity subscription = locked(accountId);
        if (subscription.cancelAtPeriodEnd == cancel) {
            return view(subscription);
        }
        subscription.cancelAtPeriodEnd = cancel;
        if (cancel) {
            subscription.nextPlanVersionId = null;
        }
        auditLog.record(
                accountId,
                actor,
                origin,
                cancel ? AuditAction.SUBSCRIPTION_CANCEL_SCHEDULED : AuditAction.SUBSCRIPTION_CANCEL_UNDONE,
                "subscription",
                subscription.id,
                Map.of("plan", plan(subscription.planVersionId).code));
        return view(subscription);
    }

    private static SubscriptionEntity locked(UUID accountId) {
        return SubscriptionEntity.lockCurrent(accountId)
                .orElseThrow(() -> new NotFoundException("The account has no subscription"));
    }

    private SubscriptionView view(SubscriptionEntity subscription) {
        PlanVersionEntity version = PlanVersionEntity.findById(subscription.planVersionId);
        PlanEntity plan = PlanEntity.findById(version.planId);
        SubscriptionPeriodEntity period = SubscriptionPeriodEntity.findOpen(subscription.id)
                .orElseThrow(() -> new IllegalStateException(
                        "Subscription " + subscription.id + " is not canceled and has no open period"));
        PlanVersionEntity versionPeriod = PlanVersionEntity.findById(period.planVersionId);
        Integer available =
                period.grantId == null ? null : CreditGrantEntity.<CreditGrantEntity>findById(period.grantId).remaining;
        int overage = ledger.overageUsed(period.id, true);
        BillingOrderEntity opening =
                period.openingOrderId == null ? null : BillingOrderEntity.findById(period.openingOrderId);
        boolean unpaid = opening != null && opening.status != BillingOrderEntity.Status.PAID;
        PlanEntity planNext = subscription.nextPlanVersionId == null ? null : plan(subscription.nextPlanVersionId);
        return new SubscriptionView(
                subscription.id,
                subscription.status,
                plan.code,
                plan.name,
                PlanVersionView.from(version),
                planNext == null ? null : planNext.name,
                subscription.nextPlanVersionId,
                subscription.cancelAtPeriodEnd,
                subscription.overageLimitCents,
                OverageLimit.documents(subscription.overageLimitCents, versionPeriod.priceOverageCents),
                subscription.startedAt,
                subscription.pastDueAt,
                unpaid ? opening.expiresAt : null,
                new SubscriptionPeriodView(
                        period.number,
                        period.startsAt,
                        period.endsAt,
                        versionPeriod.documentsIncluded,
                        available,
                        overage,
                        ledger.overageUsed(period.id, false),
                        versionPeriod.priceOverageCents,
                        new Price(
                                        Math.multiplyExact(overage, versionPeriod.priceOverageCents),
                                        versionPeriod.taxIncluded,
                                        versionPeriod.taxRate)
                                .totalCents(),
                        unpaid ? opening.id : null));
    }

    private static PlanEntity plan(UUID versionId) {
        PlanVersionEntity version = PlanVersionEntity.findById(versionId);
        return PlanEntity.findById(version.planId);
    }
}
