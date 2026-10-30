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

/** A version of a plan's price; see V31. The database refuses any change but closing it with {@link #validTo}. */
@Entity
@Table(name = "plan_prices")
public class PlanPriceEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    @Column(name = "plan_code")
    public String planCode;

    public int version;

    /** Before tax. */
    @Column(name = "amount_cents")
    public long amountCents;

    public String currency;

    @Column(name = "tax_rate")
    public BigDecimal taxRate;

    @Column(name = "valid_from")
    public OffsetDateTime validFrom;

    @Column(name = "valid_to")
    public OffsetDateTime validTo;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    /** The price that applies to the plan at the instant, if any. */
    public static Optional<PlanPriceEntity> findCurrent(String planCode, OffsetDateTime at) {
        return find("planCode = ?1 and validFrom <= ?2 and (validTo is null or validTo > ?2)", planCode, at)
                .firstResultOptional();
    }

    /** The version without an end, the one a new version closes. */
    public static Optional<PlanPriceEntity> findOpen(String planCode) {
        return find("planCode = ?1 and validTo is null", planCode).firstResultOptional();
    }

    /** Every version of the plan, newest first. */
    public static List<PlanPriceEntity> listByPlan(String planCode) {
        return list("planCode = ?1 order by version desc", planCode);
    }
}
