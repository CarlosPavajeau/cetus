package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The terms of a plan for a while; see V32. The database refuses any change but closing it with {@link #validTo}.
 * With {@link #accountId}, a private version only that account buys.
 */
@Entity
@Table(name = "plan_versions")
public class PlanVersionEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    @Column(name = "plan_id")
    public UUID planId;

    public int version;

    @Column(name = "account_id")
    public UUID accountId;

    /** Final when {@link #taxIncluded}. */
    @Column(name = "price_cents")
    public long priceCents;

    @Column(name = "tax_included")
    public boolean taxIncluded;

    @Column(name = "tax_rate")
    public BigDecimal taxRate;

    /** Each month for a subscription; for the whole validity of a package or a top-up. */
    @Column(name = "documents_included")
    public int documentsIncluded;

    /** Production issuers it includes; null for a top-up, which never adds any. */
    @Column(name = "issuers_included")
    public Integer issuersIncluded;

    /** Price of each document above the included ones; subscriptions only. */
    @Column(name = "price_overage_cents")
    public Long priceOverageCents;

    @Column(name = "valid_from")
    public OffsetDateTime validFrom;

    @Column(name = "valid_to")
    public OffsetDateTime validTo;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    /** The public version, or the account's own when given, that applies to the plan at the instant. */
    public static Optional<PlanVersionEntity> findCurrent(UUID planId, UUID accountId, OffsetDateTime at) {
        String during = "validFrom <= ?2 and (validTo is null or validTo > ?2)";
        return accountId == null
                ? find("planId = ?1 and accountId is null and " + during, planId, at)
                        .firstResultOptional()
                : find("planId = ?1 and accountId = ?3 and " + during, planId, at, accountId)
                        .firstResultOptional();
    }

    /** The version without an end for the plan and owner, the one a new version closes. */
    public static Optional<PlanVersionEntity> findOpen(UUID planId, UUID accountId) {
        return accountId == null
                ? find("planId = ?1 and accountId is null and validTo is null", planId)
                        .firstResultOptional()
                : find("planId = ?1 and accountId = ?2 and validTo is null", planId, accountId)
                        .firstResultOptional();
    }

    /** The number the plan's next version takes; versions count across public and private ones. */
    public static int versionNext(UUID planId) {
        Integer last = getEntityManager()
                .createQuery("select max(v.version) from PlanVersionEntity v where v.planId = :plan", Integer.class)
                .setParameter("plan", planId)
                .getSingleResult();
        return last == null ? 1 : last + 1;
    }

    /** Every version of the plan, public and private, newest first. */
    public static List<PlanVersionEntity> listByPlan(UUID planId) {
        return list("planId = ?1 order by version desc", planId);
    }
}
