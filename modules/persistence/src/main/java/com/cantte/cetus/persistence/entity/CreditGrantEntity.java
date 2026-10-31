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

/** A lot of credits from one source; see V36. */
@Entity
@Table(name = "credit_grants")
public class CreditGrantEntity extends PanacheEntityBase {

    public enum SourceType {
        ORDER_ITEM,
        SUBSCRIPTION_PERIOD,
        PROMO,
        ADJUSTMENT
    }

    public enum Status {
        ACTIVE,
        EXHAUSTED,
        EXPIRED,
        REVOKED
    }

    @Id
    public UUID id;

    @Column(name = "account_id")
    public UUID accountId;

    /** The product the lot comes from; null for a promotion or an adjustment without one. */
    @Column(name = "plan_version_id")
    public UUID planVersionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type")
    public SourceType sourceType;

    @Column(name = "source_id")
    public UUID sourceId;

    public int quantity;

    public int remaining;

    @Column(name = "expires_at")
    public OffsetDateTime expiresAt;

    @Enumerated(EnumType.STRING)
    public Status status;

    @Column(name = "created_at", updatable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public static Optional<CreditGrantEntity> findBySource(SourceType type, UUID sourceId) {
        return find("sourceType = ?1 and sourceId = ?2", type, sourceId).firstResultOptional();
    }

    public static Optional<CreditGrantEntity> lock(UUID id) {
        return find("id", id).withLock(LockModeType.PESSIMISTIC_WRITE).firstResultOptional();
    }

    /** The account's lots with credits left at the instant, first expiring first, locked until the transaction ends. */
    public static List<CreditGrantEntity> lockAvailable(UUID accountId, OffsetDateTime at) {
        return find(
                        "accountId = ?1 and status = ?2 and expiresAt > ?3 order by expiresAt, createdAt, id",
                        accountId,
                        Status.ACTIVE,
                        at)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .list();
    }

    /** Lots past their expiry that still count as ACTIVE or EXHAUSTED, locked until the transaction ends. */
    public static List<CreditGrantEntity> lockExpired(UUID accountId, OffsetDateTime at) {
        return find(
                        "accountId = ?1 and status in ?2 and expiresAt <= ?3 order by expiresAt, id",
                        accountId,
                        List.of(Status.ACTIVE, Status.EXHAUSTED),
                        at)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .list();
    }

    /** The account's lots, newest first. */
    public static List<CreditGrantEntity> listByAccount(UUID accountId) {
        return list("accountId = ?1 order by createdAt desc, id desc", accountId);
    }
}
