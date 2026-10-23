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
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The address that receives an account's notices of one category; see V18. */
@Entity
@Table(name = "account_contacts")
public class AccountContactEntity extends PanacheEntityBase {

    public enum Category {
        /** Webhooks and integration errors. */
        TECHNICAL,
        /** Certificate, numbering ranges and DIAN rejections. */
        FISCAL,
        /** Plan and payments of the Cetus service. */
        BILLING
    }

    @Id
    public UUID id;
    @Column(name = "account_id")
    public UUID accountId;
    @Enumerated(EnumType.STRING)
    public Category category;
    /** The verified address the notices go to; null until one is verified. */
    public String email;
    @Column(name = "verified_at")
    public OffsetDateTime verifiedAt;
    /** A change waiting for its address to be verified. */
    @Column(name = "pending_email")
    public String pendingEmail;
    @Column(name = "pending_token_hash")
    public String pendingTokenHash;
    @Column(name = "pending_expires_at")
    public OffsetDateTime pendingExpiresAt;
    /**
     * When the last verification email was requested. It outlives the change it was for (canceled or
     * verified), so the limit of one email a minute cannot be reset by canceling.
     */
    @Column(name = "pending_requested_at")
    public OffsetDateTime pendingRequestedAt;
    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    /** Drops the change waiting for verification; {@link #pendingRequestedAt} stays. */
    public void clearPending() {
        pendingEmail = null;
        pendingTokenHash = null;
        pendingExpiresAt = null;
    }

    public static List<AccountContactEntity> listByAccount(UUID accountId) {
        return list("accountId = ?1 order by category", accountId);
    }

    public static Optional<AccountContactEntity> findForUpdate(UUID accountId, Category category) {
        return find("accountId = ?1 and category = ?2", accountId, category)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    /** The verified addresses of the categories, without repeating one that serves several, in a stable order. */
    public static List<String> emails(UUID accountId, Collection<Category> categories) {
        return find("""
                        select distinct email from AccountContactEntity
                        where accountId = ?1 and category in ?2 and email is not null order by email""",
                accountId, categories).project(String.class).list();
    }

    /** The contact behind a verification link while it can still be used, locked so it is spent once. */
    public static Optional<AccountContactEntity> findByPendingToken(String tokenHash, boolean lock) {
        var query = find("pendingTokenHash = ?1 and pendingExpiresAt > ?2", tokenHash, OffsetDateTime.now());
        return (lock ? query.withLock(LockModeType.PESSIMISTIC_WRITE) : query).firstResultOptional();
    }
}
