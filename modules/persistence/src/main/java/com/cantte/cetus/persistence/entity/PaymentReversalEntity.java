package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.audit.Actor;
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
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Money that goes back from a paid order: a refund or a chargeback; see V41. */
@Entity
@Table(name = "payment_reversals")
public class PaymentReversalEntity extends PanacheEntityBase {

    public enum Kind {
        REFUND,
        CHARGEBACK
    }

    public enum Mode {
        /** Cetus asks Wompi for it. */
        WOMPI,
        /** Made elsewhere (the gateway's dashboard, a transfer, the bank) and registered here. */
        EXTERNAL
    }

    public enum Status {
        /** Registered, waiting to be sent to the gateway or approved by the worker. */
        REQUESTED,
        /** Sent, or being sent, to the gateway, which has not said how it ended. */
        SUBMITTED,
        /** The money went back and the order's effects were applied with it. */
        APPROVED,
        FAILED;

        public boolean isLive() {
            return this == REQUESTED || this == SUBMITTED;
        }
    }

    @Id
    public UUID id;

    @Column(name = "order_id")
    public UUID orderId;

    @Column(name = "account_id")
    public UUID accountId;

    public int number;

    @Enumerated(EnumType.STRING)
    public Kind kind;

    @Enumerated(EnumType.STRING)
    public Mode mode;

    /** The order's reference and the reversal's number. */
    public String reference;

    @Column(name = "amount_cents")
    public long amountCents;

    @Enumerated(EnumType.STRING)
    public Status status;

    /** The approved transaction the money goes back from; required to ask Wompi. */
    @Column(name = "provider_transaction_id")
    public String providerTransactionId;

    @Column(name = "provider_refund_id")
    public String providerRefundId;

    @Column(name = "failure_message")
    public String failureMessage;

    public String reason;

    @Column(name = "actor_type")
    public String actorType;

    @Column(name = "actor_id")
    public String actorId;

    /** Credits the order's lots had left when it was approved, now revoked. */
    @Column(name = "credits_revoked")
    public Integer creditsRevoked;

    /** What the account consumed of the order and owes after a chargeback. */
    @Column(name = "debt_cents")
    public Long debtCents;

    @Column(name = "debt_order_id")
    public UUID debtOrderId;

    @Column(name = "credit_note_document_id")
    public UUID creditNoteDocumentId;

    @Column(name = "approved_at")
    public OffsetDateTime approvedAt;

    @Column(name = "created_at", updatable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    /** The order's next reversal; the order must be locked and have no live one. */
    public static PaymentReversalEntity request(
            BillingOrderEntity order,
            Kind kind,
            Mode mode,
            long amountCents,
            String providerTransactionId,
            Actor actor,
            String reason) {
        int number = ((Number) getEntityManager()
                                .createQuery("SELECT coalesce(max(r.number), 0) FROM PaymentReversalEntity r"
                                        + " WHERE r.orderId = :order")
                                .setParameter("order", order.id)
                                .getSingleResult())
                        .intValue()
                + 1;
        PaymentReversalEntity reversal = new PaymentReversalEntity();
        reversal.id = Ids.newId();
        reversal.orderId = order.id;
        reversal.accountId = order.accountId;
        reversal.number = number;
        reversal.kind = kind;
        reversal.mode = mode;
        reversal.reference = order.reference + "-R" + number;
        reversal.amountCents = amountCents;
        reversal.status = Status.REQUESTED;
        reversal.providerTransactionId = providerTransactionId;
        reversal.reason = reason;
        reversal.actorType = actor.type().name();
        reversal.actorId = actor.id();
        reversal.persist();
        return reversal;
    }

    public static Optional<PaymentReversalEntity> lock(UUID id) {
        return Optional.ofNullable(findById(id, LockModeType.PESSIMISTIC_WRITE));
    }

    /** The order's reversals, the first first. */
    public static List<PaymentReversalEntity> listByOrder(UUID orderId) {
        return list("orderId = ?1 order by number", orderId);
    }

    /** The reversals of the orders, each order's first first. */
    public static List<PaymentReversalEntity> listByOrders(Collection<UUID> orderIds) {
        return orderIds.isEmpty() ? List.of() : list("orderId in ?1 order by number", orderIds);
    }

    /** The order's reversal waiting to be sent or answered; there is one at most. */
    public static Optional<PaymentReversalEntity> findLive(UUID orderId) {
        return find("orderId = ?1 and status in ?2", orderId, List.of(Status.REQUESTED, Status.SUBMITTED))
                .firstResultOptional();
    }

    /** What the order's approved reversals gave back. */
    public static long approvedCents(UUID orderId) {
        return ((Number) getEntityManager()
                        .createQuery("SELECT coalesce(sum(r.amountCents), 0) FROM PaymentReversalEntity r"
                                + " WHERE r.orderId = :order AND r.status = :status")
                        .setParameter("order", orderId)
                        .setParameter("status", Status.APPROVED)
                        .getSingleResult())
                .longValue();
    }
}
