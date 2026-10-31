package com.cantte.cetus.api.support;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionPeriodEntity;
import io.quarkus.arc.Unremovable;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Subscriptions started straight in the database, as the worker does once their first order is paid. */
@Unremovable
@ApplicationScoped
public class Subscriptions {

    @Inject
    CreditLedger ledger;

    public record Started(UUID subscriptionId, UUID periodId, UUID grantId) {}

    /**
     * An active subscription to the plan's current public version, its first period started now and, unless the
     * lot is left out, the period's lot with {@code documents} of it left.
     */
    public Started subscribe(UUID accountId, String planCode, Integer documents) {
        return QuarkusTransaction.requiringNew().call(() -> {
            OffsetDateTime now = OffsetDateTime.now();
            PlanVersionEntity version = PlanVersionEntity.findCurrent(PlanEntity.byCode(planCode).id, null, now)
                    .orElseThrow();
            SubscriptionEntity subscription = new SubscriptionEntity();
            subscription.id = Ids.newId();
            subscription.accountId = accountId;
            subscription.planVersionId = version.id;
            subscription.status = SubscriptionEntity.Status.ACTIVE;
            subscription.overageLimitCents = version.priceCents * 3;
            subscription.startedAt = now;
            subscription.persist();
            SubscriptionPeriodEntity period = new SubscriptionPeriodEntity();
            period.id = Ids.newId();
            period.subscriptionId = subscription.id;
            period.number = 1;
            period.planVersionId = version.id;
            period.startsAt = now;
            period.endsAt = now.plusMonths(1);
            period.status = SubscriptionPeriodEntity.Status.OPEN;
            period.persist();
            if (documents != null) {
                CreditGrantEntity lot = ledger.grant(
                                accountId,
                                new CreditLedger.Source(CreditGrantEntity.SourceType.SUBSCRIPTION_PERIOD, period.id),
                                version.id,
                                documents,
                                period.endsAt.plusDays(60),
                                Actor.system(),
                                null)
                        .orElseThrow();
                period.grantId = lot.id;
            }
            return new Started(subscription.id, period.id, period.grantId);
        });
    }

    /** The subscription's overage limit, in COP cents. */
    public static void overageLimit(UUID subscriptionId, long cents) {
        QuarkusTransaction.requiringNew()
                .run(() -> SubscriptionEntity.<SubscriptionEntity>findById(subscriptionId).overageLimitCents = cents);
    }
}
