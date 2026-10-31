package com.cantte.cetus.persistence.entity;

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

/** A month of a subscription; see V38. */
@Entity
@Table(name = "subscription_periods")
public class SubscriptionPeriodEntity extends PanacheEntityBase {

    public enum Status {
        OPEN,
        CLOSED
    }

    @Id
    public UUID id;

    @Column(name = "subscription_id")
    public UUID subscriptionId;

    public int number;

    @Column(name = "plan_version_id")
    public UUID planVersionId;

    @Column(name = "starts_at")
    public OffsetDateTime startsAt;

    @Column(name = "ends_at")
    public OffsetDateTime endsAt;

    @Enumerated(EnumType.STRING)
    public Status status;

    /** Its lot, once the order that opens it is paid. */
    @Column(name = "grant_id")
    public UUID grantId;

    @Column(name = "opening_order_id")
    public UUID openingOrderId;

    @Column(name = "closing_order_id")
    public UUID closingOrderId;

    /** Overage documents billed at its close; null while open. */
    @Column(name = "overage_quantity")
    public Integer overageQuantity;

    @Column(name = "closed_at")
    public OffsetDateTime closedAt;

    @Column(name = "created_at", updatable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    /** The subscription's open period; there is at most one. */
    public static Optional<SubscriptionPeriodEntity> findOpen(UUID subscriptionId) {
        return find("subscriptionId = ?1 and status = ?2", subscriptionId, Status.OPEN)
                .firstResultOptional();
    }

    public static Optional<SubscriptionPeriodEntity> lock(UUID id) {
        return findByIdOptional(id, LockModeType.PESSIMISTIC_WRITE);
    }

    public static Optional<SubscriptionPeriodEntity> findByOpeningOrder(UUID orderId) {
        return find("openingOrderId", orderId).firstResultOptional();
    }

    /** Ids of the open periods that ended at the instant, first ending first. */
    public static List<UUID> listEnded(OffsetDateTime at) {
        return getEntityManager()
                .createQuery(
                        "SELECT p.id FROM SubscriptionPeriodEntity p WHERE p.status = :status AND p.endsAt <= :at"
                                + " ORDER BY p.endsAt, p.id",
                        UUID.class)
                .setParameter("status", Status.OPEN)
                .setParameter("at", at)
                .getResultList();
    }
}
