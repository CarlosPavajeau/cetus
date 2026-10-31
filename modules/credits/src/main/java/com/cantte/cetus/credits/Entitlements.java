package com.cantte.cetus.credits;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * What the account's lots give it at an instant: a product (a package lot still within its validity, exhausted or
 * not), the production issuers it includes (the most of those lots) and the grace margin of a package. A
 * subscription adds to them in phase 6.
 */
@ApplicationScoped
public class Entitlements {

    static final int GRACE_MIN = 10;
    static final int GRACE_PERCENT = 10;

    /**
     * @param graceMargin documents a package account may issue without credits: 10 % of its last package or
     *     top-up lot, at least {@value #GRACE_MIN}; 0 without a product
     */
    public record Entitlement(boolean product, int issuersIncluded, int graceMargin) {

        static final Entitlement NONE = new Entitlement(false, 0, 0);
    }

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
        if (packages.isEmpty()) {
            return Entitlement.NONE;
        }
        int issuers = packages.stream()
                .mapToInt(lot -> ((Number) lot[1]).intValue())
                .max()
                .orElseThrow();
        int quantityLast = ((Number) lots.getFirst()[2]).intValue();
        int grace = Math.max(GRACE_MIN, Math.ceilDiv(quantityLast * GRACE_PERCENT, 100));
        return new Entitlement(true, issuers, grace);
    }
}
