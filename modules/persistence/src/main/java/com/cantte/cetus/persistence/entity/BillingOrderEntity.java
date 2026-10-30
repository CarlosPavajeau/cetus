package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.Party;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** What an account buys and what it pays; see V34. */
@Entity
@Table(name = "billing_orders")
public class BillingOrderEntity extends PanacheEntityBase {

    public enum Kind {
        PURCHASE,
        RENEWAL,
        MANUAL
    }

    public enum Status {
        PENDING,
        PAID,
        FAILED,
        EXPIRED,
        REFUNDED
    }

    @Id
    public UUID id;

    @Column(name = "account_id")
    public UUID accountId;

    @Enumerated(EnumType.STRING)
    public Kind kind;

    @Enumerated(EnumType.STRING)
    public Status status;

    /** What the payment gateway knows the order by. */
    public String reference;

    @Column(name = "subtotal_cents")
    public long subtotalCents;

    @Column(name = "tax_cents")
    public long taxCents;

    @Column(name = "total_cents")
    public long totalCents;

    public String currency;

    /** Who is invoiced, as the billing profile was when the order was placed. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "billing_profile")
    public Party billingProfile;

    @Column(name = "expires_at")
    public OffsetDateTime expiresAt;

    @Column(name = "paid_at")
    public OffsetDateTime paidAt;

    @Column(name = "invoice_document_id")
    public UUID invoiceDocumentId;

    /** What needs a person before the order can go on, such as a payment of another amount. */
    @Column(name = "review_reason")
    public String reviewReason;

    @Column(name = "created_at", updatable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    /** The order with the reference, locked until the transaction ends. */
    public static Optional<BillingOrderEntity> lockByReference(String reference) {
        return find("reference = ?1", reference)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    public static Optional<BillingOrderEntity> findForAccount(UUID id, UUID accountId) {
        return find("id = ?1 and accountId = ?2", id, accountId).firstResultOptional();
    }

    /** The account's orders, newest first. */
    public static List<BillingOrderEntity> listByAccount(UUID accountId, int limit) {
        return find("accountId = ?1 order by createdAt desc, id desc", accountId)
                .page(0, limit)
                .list();
    }

    /**
     * Whether the account paid for a plan of the kind that still lasts: bought within its validity months. Until
     * credits exist (phase 3) a paid order is what proves a package.
     */
    public static boolean hasLasting(UUID accountId, PlanEntity.Kind kind, OffsetDateTime at) {
        return !getEntityManager()
                .createNativeQuery("""
                        SELECT 1 FROM billing.billing_orders o
                        JOIN billing.billing_order_items i ON i.order_id = o.id
                        JOIN billing.plan_versions v ON v.id = i.plan_version_id
                        JOIN billing.plans p ON p.id = v.plan_id
                        WHERE o.account_id = :account AND o.status = 'PAID' AND p.kind = :kind
                          AND o.paid_at + make_interval(months => p.validity_months) > :at
                        LIMIT 1
                        """)
                .setParameter("account", accountId)
                .setParameter("kind", kind.name())
                .setParameter("at", at)
                .getResultList()
                .isEmpty();
    }
}
