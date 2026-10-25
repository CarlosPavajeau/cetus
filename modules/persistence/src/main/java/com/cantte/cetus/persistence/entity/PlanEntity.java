package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;

/** What a plan includes; see V24. A null limit is no limit, and a null price is agreed by contract. */
@Entity
@Table(name = "plans")
public class PlanEntity extends PanacheEntityBase {

    @Id
    public String code;

    public String name;

    @Column(name = "price_monthly_cop")
    public Long priceMonthlyCop;

    @Column(name = "documents_included")
    public Integer documentsIncluded;

    @Column(name = "price_overage_cop")
    public Integer priceOverageCop;

    @Column(name = "issuers_included")
    public Integer issuersIncluded;

    @Column(name = "requests_per_minute")
    public Integer requestsPerMinute;

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
}
