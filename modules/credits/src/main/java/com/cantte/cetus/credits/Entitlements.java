package com.cantte.cetus.credits;

import com.cantte.cetus.domain.billing.OverageLimit;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionPeriodEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * What the account has at an instant: a product (a package lot still within its validity, exhausted or not, or a
 * subscription that is not canceled), the production issuers it includes (the most of those) and what it may
 * issue without credits: the grace margin of a package, or the overage of a subscription, which replaces it.
 */
@ApplicationScoped
public class Entitlements {

    static final int GRACE_MIN = 10;
    static final int GRACE_PERCENT = 10;

    /**
     * @param productPackage whether a package lot is in force
     * @param subscription the subscription that is not canceled, if any
     * @param graceMargin documents a package account without a subscription may issue without credits: 10 % of
     *     its last package or top-up lot, at least {@value #GRACE_MIN}; 0 otherwise
     */
    public record Entitlement(
            boolean productPackage, Optional<Subscribed> subscription, int issuersIncluded, int graceMargin) {

        static final Entitlement NONE = new Entitlement(false, Optional.empty(), 0, 0);

        public boolean product() {
            return productPackage || subscription.isPresent();
        }
    }

    /**
     * @param periodId the open period, where overage documents go
     * @param overageLimit overage documents the period may bill before new ones are refused
     */
    public record Subscribed(UUID id, UUID periodId, int overageLimit) {}

    @Inject
    EntityManager em;

    @Transactional(Transactional.TxType.MANDATORY)
    public Entitlement of(UUID accountId, OffsetDateTime at) {
        @SuppressWarnings("unchecked")
        List<Object[]> lots = em.createNativeQuery("""
                        SELECT p.kind, v.issuers_included, g.quantity
                        FROM billing.credit_grants g
                        JOIN billing.plan_versions v ON v.id = g.plan_version_id
                        JOIN billing.plans p ON p.id = v.plan_id
                        WHERE g.account_id = :account AND g.status IN ('ACTIVE', 'EXHAUSTED')
                          AND g.expires_at > :at AND p.kind IN ('PACKAGE', 'TOPUP')
                        ORDER BY g.created_at DESC, g.id DESC
                        """)
                .setParameter("account", accountId)
                .setParameter("at", at)
                .getResultList();
        List<Object[]> packages =
                lots.stream().filter(lot -> "PACKAGE".equals(lot[0])).toList();
        int issuersPackage = packages.stream()
                .mapToInt(lot -> ((Number) lot[1]).intValue())
                .max()
                .orElse(0);
        Optional<SubscriptionEntity> current = SubscriptionEntity.findCurrent(accountId);
        if (current.isPresent()) {
            SubscriptionEntity subscription = current.get();
            PlanVersionEntity version = PlanVersionEntity.findById(subscription.planVersionId);
            SubscriptionPeriodEntity period = SubscriptionPeriodEntity.findOpen(subscription.id)
                    .orElseThrow(() -> new IllegalStateException(
                            "Subscription " + subscription.id + " is not canceled and has no open period"));
            PlanVersionEntity versionPeriod = period.planVersionId.equals(version.id)
                    ? version
                    : PlanVersionEntity.findById(period.planVersionId);
            int overageLimit = OverageLimit.documents(subscription.overageLimitCents, versionPeriod.priceOverageCents);
            return new Entitlement(
                    !packages.isEmpty(),
                    Optional.of(new Subscribed(subscription.id, period.id, overageLimit)),
                    Math.max(issuersPackage, version.issuersIncluded),
                    0);
        }
        if (packages.isEmpty()) {
            return Entitlement.NONE;
        }
        int quantityLast = ((Number) lots.getFirst()[2]).intValue();
        int grace = Math.max(GRACE_MIN, Math.ceilDiv(quantityLast * GRACE_PERCENT, 100));
        return new Entitlement(true, Optional.empty(), issuersPackage, grace);
    }
}
