package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.Ids;
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
import java.security.SecureRandom;
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

    public static final String CURRENCY = "COP";

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final char[] BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ".toCharArray();

    public enum Kind {
        PURCHASE,
        RENEWAL,
        MANUAL,
        /** What the account consumed and did not pay; it never expires and blocks purchases while pending. */
        DEBT
    }

    public enum Status {
        PENDING,
        PAID,
        FAILED,
        EXPIRED,
        REFUNDED,
        /** A debt the Cetus team forgave. */
        CANCELED
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

    /** Null only for a debt, which never expires. */
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

    /**
     * A pending order without items, in COP and invoiced to the billing profile as it is now; {@link
     * BillingOrderItemEntity#add} adds its items and amounts.
     */
    public static BillingOrderEntity open(
            UUID accountId, Kind kind, BillingProfileEntity profile, OffsetDateTime expiresAt) {
        return open(accountId, kind, profile.party, expiresAt);
    }

    /** Like {@link #open(UUID, Kind, BillingProfileEntity, OffsetDateTime)}, invoiced to whom another order copied. */
    public static BillingOrderEntity open(UUID accountId, Kind kind, Party billingProfile, OffsetDateTime expiresAt) {
        BillingOrderEntity order = new BillingOrderEntity();
        order.id = Ids.newId();
        order.accountId = accountId;
        order.kind = kind;
        order.status = Status.PENDING;
        order.reference = reference();
        order.currency = CURRENCY;
        order.billingProfile = billingProfile;
        order.expiresAt = expiresAt;
        order.persist();
        return order;
    }

    /** Pending and not expired; a debt never expires. */
    public boolean isPayable(OffsetDateTime at) {
        return status == Status.PENDING && (expiresAt == null || expiresAt.isAfter(at));
    }

    /** Whether the account owes a debt, which blocks new purchases. */
    public static boolean hasDebt(UUID accountId) {
        return findDebt(accountId).isPresent();
    }

    /** The account's oldest pending debt. */
    public static Optional<BillingOrderEntity> findDebt(UUID accountId) {
        return find(
                        "accountId = ?1 and kind = ?2 and status = ?3 order by createdAt, id",
                        accountId,
                        Kind.DEBT,
                        Status.PENDING)
                .firstResultOptional();
    }

    /** "CET-" and 26 characters of Crockford's base32: 128 random bits. */
    public static String reference() {
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        StringBuilder reference = new StringBuilder("CET-");
        int buffer = 0;
        int bits = 0;
        for (byte b : bytes) {
            buffer = (buffer << 8) | (b & 0xff);
            bits += 8;
            while (bits >= 5) {
                reference.append(BASE32[(buffer >>> (bits - 5)) & 31]);
                bits -= 5;
            }
        }
        reference.append(BASE32[(buffer << (5 - bits)) & 31]);
        return reference.toString();
    }

    /** The order with the reference, locked until the transaction ends. */
    public static Optional<BillingOrderEntity> lockByReference(String reference) {
        return find("reference = ?1", reference)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    /** The order, locked until the transaction ends. */
    public static Optional<BillingOrderEntity> lock(UUID id) {
        return Optional.ofNullable(findById(id, LockModeType.PESSIMISTIC_WRITE));
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
     * What the orders paid in [from, to) add up to, less the money that went back from any order in [from, to): a
     * refund or a chargeback lowers the income of the year it happens in.
     */
    public static long revenueCents(OffsetDateTime from, OffsetDateTime to) {
        return ((Number) getEntityManager()
                        .createNativeQuery("""
                                SELECT (SELECT coalesce(sum(total_cents), 0) FROM billing.billing_orders
                                        WHERE status IN ('PAID', 'REFUNDED') AND paid_at >= :from AND paid_at < :to)
                                     - (SELECT coalesce(sum(amount_cents), 0) FROM billing.payment_reversals
                                        WHERE status = 'APPROVED' AND approved_at >= :from AND approved_at < :to)
                                """)
                        .setParameter("from", from)
                        .setParameter("to", to)
                        .getSingleResult())
                .longValue();
    }
}
