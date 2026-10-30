package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Table;
import java.util.List;

/**
 * What a plan includes; see V24 and V31. A null limit is no limit, and a null price is agreed by contract. Only a
 * subscription is an account's plan; a package or a top-up is bought once and lasts {@link #validityMonths}.
 */
@Entity
@Table(name = "plans")
public class PlanEntity extends PanacheEntityBase {

    public enum Kind {
        SUBSCRIPTION,
        PACKAGE,
        TOPUP
    }

    @Id
    public String code;

    public String name;

    @Enumerated(EnumType.STRING)
    public Kind kind = Kind.SUBSCRIPTION;

    /** How long the documents of a package or a top-up last; null for a subscription, whose are monthly. */
    @Column(name = "validity_months")
    public Integer validityMonths;

    /** Whether it is still sold; a retired plan keeps its row for the accounts and orders that reference it. */
    public boolean active = true;

    @Column(name = "price_monthly_cop")
    public Long priceMonthlyCop;

    @Column(name = "documents_included")
    public Integer documentsIncluded;

    /**
     * Production documents a month may take above {@link #documentsIncluded} before new ones are refused; null
     * never refuses them and bills the overage. Credit notes are always taken.
     */
    @Column(name = "documents_grace")
    public Integer documentsGrace;

    @Column(name = "price_overage_cop")
    public Integer priceOverageCop;

    @Column(name = "issuers_included")
    public Integer issuersIncluded;

    /** Production API requests a second, shared by the account's keys; null keeps the API's per-key limit. */
    @Column(name = "requests_per_second")
    public Integer requestsPerSecond;

    /** Requests the account may make at once; set together with {@link #requestsPerSecond}. */
    @Column(name = "requests_burst")
    public Integer requestsBurst;

    public boolean assignable;

    /** The plan of an account; every account references one. */
    public static PlanEntity of(AccountEntity account) {
        PlanEntity plan = findById(account.plan);
        if (plan == null) {
            throw new IllegalStateException("Account " + account.id + " has an unknown plan " + account.plan);
        }
        return plan;
    }

    public static List<PlanEntity> listAssignable() {
        return list("assignable = true order by coalesce(priceMonthlyCop, 0), code");
    }

    public static PlanEntity lock(String code) {
        return findById(code, LockModeType.PESSIMISTIC_WRITE);
    }
}
