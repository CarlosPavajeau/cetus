package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.Environment;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Something that happened to a document, published once to the account's webhook endpoints. */
@Entity
@Table(name = "webhook_events")
public class WebhookEventEntity extends PanacheEntityBase {

    @Id
    public UUID id;
    @Column(name = "account_id")
    public UUID accountId;
    @Enumerated(EnumType.STRING)
    public Environment environment;
    /** Wire name, e.g. {@code invoice.accepted}. */
    public String type;
    @Column(name = "document_id")
    public UUID documentId;
    /** The exact JSON body every endpoint receives. */
    @JdbcTypeCode(SqlTypes.JSON)
    public String payload;
    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;
}
