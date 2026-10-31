package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Table;
import java.util.Optional;
import java.util.UUID;

/**
 * A plan of the catalog; see V31, V32 and V39. What it sells lives in its versions ({@link PlanVersionEntity}).
 * A subscription renews every month; a package or a top-up is bought once and lasts {@link #validityMonths}.
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
    public UUID id;

    /** Unique, for people and code to name the plan. */
    public String code;

    public String name;

    @Enumerated(EnumType.STRING)
    public Kind kind = Kind.SUBSCRIPTION;

    /** How long the documents of a package or a top-up last; null for a subscription, whose are monthly. */
    @Column(name = "validity_months")
    public Integer validityMonths;

    /** The kind of product an account must have to buy this one: a top-up requires a package. */
    @Enumerated(EnumType.STRING)
    @Column(name = "requires_kind")
    public Kind requiresKind;

    /** Shown in the catalog to everyone; an unlisted plan (Socios) is sold through versions for one account. */
    public boolean listed = true;

    /** Whether it is still sold; a retired plan keeps its row for the accounts and orders that reference it. */
    public boolean active = true;

    /**
     * Production API requests a second for the accounts subscribed to the plan, shared by their keys; null keeps
     * the API's per-key limit. Subscriptions only.
     */
    @Column(name = "requests_per_second")
    public Integer requestsPerSecond;

    /** Requests the account may make at once; set together with {@link #requestsPerSecond}. */
    @Column(name = "requests_burst")
    public Integer requestsBurst;

    /**
     * SQL for the name of the product of the account {@code a.id} now: its subscription's plan, else the package in
     * force that lasts longest; null without one.
     */
    public static final String SQL_PRODUCT_NAME = """
            coalesce(
                (SELECT p.name FROM billing.subscriptions s
                 JOIN billing.plan_versions v ON v.id = s.plan_version_id JOIN billing.plans p ON p.id = v.plan_id
                 WHERE s.account_id = a.id AND s.status <> 'CANCELED'),
                (SELECT p.name FROM billing.credit_grants g
                 JOIN billing.plan_versions v ON v.id = g.plan_version_id JOIN billing.plans p ON p.id = v.plan_id
                 WHERE g.account_id = a.id AND p.kind = 'PACKAGE' AND g.status IN ('ACTIVE', 'EXHAUSTED')
                   AND g.expires_at > now()
                 ORDER BY g.expires_at DESC, g.id DESC LIMIT 1))""";

    /** The name of the account's product now ({@link #SQL_PRODUCT_NAME}), if it has one. */
    public static Optional<String> productName(UUID accountId) {
        return Optional.ofNullable((String) getEntityManager()
                .createNativeQuery("SELECT " + SQL_PRODUCT_NAME + " FROM billing.accounts a WHERE a.id = :account")
                .setParameter("account", accountId)
                .getSingleResult());
    }

    public static Optional<PlanEntity> findByCode(String code) {
        return find("code", code).firstResultOptional();
    }

    /** A plan the code always has. */
    public static PlanEntity byCode(String code) {
        return findByCode(code).orElseThrow(() -> new IllegalStateException("There is no plan " + code));
    }

    public static Optional<PlanEntity> lock(UUID id) {
        return findByIdOptional(id, LockModeType.PESSIMISTIC_WRITE);
    }
}
