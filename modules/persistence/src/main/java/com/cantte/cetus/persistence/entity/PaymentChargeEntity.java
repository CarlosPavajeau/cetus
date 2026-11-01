package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.Ids;
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

/** An attempt to charge an order to a saved card; see V40. */
@Entity
@Table(name = "payment_charges")
public class PaymentChargeEntity extends PanacheEntityBase {

    public enum Origin {
        /** The renewal's own charge and its retries. */
        AUTO,
        /** Asked for from the console. */
        MANUAL
    }

    public enum Status {
        /** Waits for its run_at. */
        SCHEDULED,
        /** Sent, or being sent, to the provider; its transaction says how it ends. */
        SUBMITTED,
        APPROVED,
        FAILED,
        /** Not sent: the order was paid otherwise, or the account has no card any more. */
        CANCELED;

        public boolean isLive() {
            return this == SCHEDULED || this == SUBMITTED;
        }
    }

    @Id
    public UUID id;

    @Column(name = "order_id")
    public UUID orderId;

    @Column(name = "payment_method_id")
    public UUID paymentMethodId;

    public int attempt;

    @Enumerated(EnumType.STRING)
    public Origin origin;

    /** The order's reference and the attempt's number: the provider takes a reference once. */
    public String reference;

    @Enumerated(EnumType.STRING)
    public Status status;

    @Column(name = "run_at")
    public OffsetDateTime runAt;

    @Column(name = "provider_transaction_id")
    public String providerTransactionId;

    /** The provider's reason for a declined or failed charge, as it can be shown to the customer. */
    @Column(name = "failure_message")
    public String failureMessage;

    @Column(name = "created_at", updatable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    /** The order's next attempt, to run at {@code runAt}; the order must be locked and have no live attempt. */
    public static PaymentChargeEntity schedule(
            BillingOrderEntity order, PaymentMethodEntity method, Origin origin, OffsetDateTime runAt) {
        int attempt = ((Number) getEntityManager()
                                .createQuery(
                                        "SELECT coalesce(max(c.attempt), 0) FROM PaymentChargeEntity c"
                                                + " WHERE c.orderId = :order")
                                .setParameter("order", order.id)
                                .getSingleResult())
                        .intValue()
                + 1;
        PaymentChargeEntity charge = new PaymentChargeEntity();
        charge.id = Ids.newId();
        charge.orderId = order.id;
        charge.paymentMethodId = method.id;
        charge.attempt = attempt;
        charge.origin = origin;
        charge.reference = order.reference + "-" + attempt;
        charge.status = Status.SCHEDULED;
        charge.runAt = runAt;
        charge.persist();
        return charge;
    }

    public static Optional<PaymentChargeEntity> findByReference(String reference) {
        return find("reference = ?1", reference).firstResultOptional();
    }

    public static Optional<PaymentChargeEntity> lock(UUID id) {
        return Optional.ofNullable(findById(id, LockModeType.PESSIMISTIC_WRITE));
    }

    /** The order's attempt waiting to run or to be answered; there is one at most. */
    public static Optional<PaymentChargeEntity> findLive(UUID orderId) {
        return find("orderId = ?1 and status in ?2", orderId, List.of(Status.SCHEDULED, Status.SUBMITTED))
                .firstResultOptional();
    }

    /** The order's attempts, the first first. */
    public static List<PaymentChargeEntity> listByOrder(UUID orderId) {
        return list("orderId = ?1 order by attempt", orderId);
    }
}
