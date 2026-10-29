package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A help request from the console, emailed to the Cetus support mailbox; see V28. */
@Entity
@Table(name = "support_tickets")
public class SupportTicketEntity extends PanacheEntityBase {

    @Schema(name = "SupportTicketPriority")
    public enum Priority {
        CRITICAL,
        HIGH,
        MEDIUM,
        LOW
    }

    @Schema(name = "SupportTicketStatus")
    public enum Status {
        OPEN,
        IN_PROGRESS,
        RESOLVED
    }

    @Id
    public UUID id;

    public long number;

    @Column(name = "account_id")
    public UUID accountId;

    @Column(name = "user_id")
    public String userId;

    @Column(name = "user_email")
    public String userEmail;

    @Column(name = "issuer_id")
    public UUID issuerId;

    @Enumerated(EnumType.STRING)
    public Priority priority;

    @Enumerated(EnumType.STRING)
    public Status status = Status.OPEN;

    public String message;

    /** The account and issuer as they were when the ticket was opened. Never secrets. */
    @JdbcTypeCode(SqlTypes.JSON)
    public Map<String, Object> context = new HashMap<>();

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public static long nextNumber() {
        return ((Number) getEntityManager()
                        .createNativeQuery("SELECT nextval('billing.support_ticket_numbers')")
                        .getSingleResult())
                .longValue();
    }

    public static Optional<SupportTicketEntity> findForAccount(UUID accountId, UUID id) {
        return find("id = ?1 and accountId = ?2", id, accountId).firstResultOptional();
    }

    /** Newest first, paginated by id (UUID v7): pass the last id of the previous page as {@code beforeId}. */
    public static List<SupportTicketEntity> pageByAccount(UUID accountId, UUID beforeId, int limit) {
        return beforeId == null
                ? find("accountId = ?1 order by id desc", accountId)
                        .page(0, limit)
                        .list()
                : find("accountId = ?1 and id < ?2 order by id desc", accountId, beforeId)
                        .page(0, limit)
                        .list();
    }

    /** Every account's tickets, newest first, optionally in one status. */
    public static List<SupportTicketEntity> page(Status status, UUID beforeId, int limit) {
        StringBuilder query = new StringBuilder("1 = 1");
        Map<String, Object> params = new HashMap<>();
        if (status != null) {
            query.append(" and status = :status");
            params.put("status", status);
        }
        if (beforeId != null) {
            query.append(" and id < :before");
            params.put("before", beforeId);
        }
        return find(query + " order by id desc", params).page(0, limit).list();
    }

    public static long countByUserSince(String userId, OffsetDateTime since) {
        return count("userId = ?1 and createdAt >= ?2", userId, since);
    }
}
