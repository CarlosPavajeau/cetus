package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A notice emailed to an account's contacts; see V18 (notification_log). */
@Entity
@Table(name = "notification_log")
public class NotificationEntity extends PanacheEntityBase {

    public enum Status {
        PENDING,
        SENT,
        SKIPPED,
        FAILED
    }

    @Id
    public UUID id;

    @Column(name = "account_id")
    public UUID accountId;
    /** Name of a NotificationKind. */
    public String kind;

    @Column(name = "dedup_key")
    public String dedupKey;
    /** What the email says: names, dates, links. Never secrets. */
    @JdbcTypeCode(SqlTypes.JSON)
    public Map<String, String> data = new HashMap<>();

    @Enumerated(EnumType.STRING)
    public Status status = Status.PENDING;

    @JdbcTypeCode(SqlTypes.ARRAY)
    public String[] recipients = new String[0];

    public String error;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "sent_at")
    public OffsetDateTime sentAt;
}
