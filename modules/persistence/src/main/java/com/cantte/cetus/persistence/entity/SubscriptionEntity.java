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

/** A monthly subscription of an account; see V38. */
@Entity
@Table(name = "subscriptions")
public class SubscriptionEntity extends PanacheEntityBase {

    public enum Status {
        ACTIVE,
        PAST_DUE,
        CANCELED
    }

    @Id
    public UUID id;

    @Column(name = "account_id")
    public UUID accountId;

    /** The version the open period was sold at. */
    @Column(name = "plan_version_id")
    public UUID planVersionId;

    /** The version the next period takes, when the owner scheduled a change; null keeps the current one. */
    @Column(name = "next_plan_version_id")
    public UUID nextPlanVersionId;

    @Enumerated(EnumType.STRING)
    public Status status;

    /** How much overage a period may run up before new documents are refused; credit notes are never refused. */
    @Column(name = "overage_limit_cents")
    public long overageLimitCents;

    @Column(name = "cancel_at_period_end")
    public boolean cancelAtPeriodEnd;

    @Column(name = "started_at")
    public OffsetDateTime startedAt;

    /** When the renewal of the open period went unpaid; the subscription is canceled once the grace days pass. */
    @Column(name = "past_due_at")
    public OffsetDateTime pastDueAt;

    @Column(name = "canceled_at")
    public OffsetDateTime canceledAt;

    @Column(name = "created_at", updatable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    /** The account's subscription that is not canceled; there is at most one. */
    public static Optional<SubscriptionEntity> findCurrent(UUID accountId) {
        return find("accountId = ?1 and status <> ?2", accountId, Status.CANCELED)
                .firstResultOptional();
    }

    /** {@link #findCurrent}, locked until the transaction ends. */
    public static Optional<SubscriptionEntity> lockCurrent(UUID accountId) {
        return find("accountId = ?1 and status <> ?2", accountId, Status.CANCELED)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    public static Optional<SubscriptionEntity> lock(UUID id) {
        return findByIdOptional(id, LockModeType.PESSIMISTIC_WRITE);
    }

    /** Ids of the subscriptions whose renewal is unpaid, the longest unpaid first. */
    public static List<UUID> listPastDue() {
        return getEntityManager()
                .createQuery(
                        "SELECT s.id FROM SubscriptionEntity s WHERE s.status = :status ORDER BY s.pastDueAt, s.id",
                        UUID.class)
                .setParameter("status", Status.PAST_DUE)
                .getResultList();
    }
}
