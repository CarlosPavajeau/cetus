package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** One event sent to one endpoint, retried by its DELIVER_WEBHOOK job until the endpoint answers 2xx. */
@Entity
@Table(name = "webhook_deliveries")
public class WebhookDeliveryEntity extends PanacheEntityBase {

    /** CANCELED: the endpoint was disabled before the delivery went out. */
    public enum Status { PENDING, SUCCEEDED, FAILED, CANCELED }

    @Id
    public UUID id;
    @Column(name = "event_id")
    public UUID eventId;
    @Column(name = "endpoint_id")
    public UUID endpointId;
    @Enumerated(EnumType.STRING)
    public Status status = Status.PENDING;
    public int attempts;
    @Column(name = "last_response_status")
    public Integer lastResponseStatus;
    @Column(name = "last_response_body")
    public String lastResponseBody;
    @Column(name = "last_error")
    public String lastError;
    @Column(name = "last_attempt_at")
    public OffsetDateTime lastAttemptAt;
    @Column(name = "delivered_at")
    public OffsetDateTime deliveredAt;
    /** Set by the database; read back after the insert, so it is available once the entity is flushed. */
    @Generated(event = EventType.INSERT)
    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;
    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public static Optional<WebhookDeliveryEntity> findForEndpoint(UUID endpointId, UUID id) {
        return find("id = ?1 and endpointId = ?2", id, endpointId).firstResultOptional();
    }

    /** Newest first; ids are UUID v7, so {@code beforeId} (exclusive) works as a cursor. */
    public static List<WebhookDeliveryEntity> pageByEndpoint(UUID endpointId, UUID beforeId, int limit) {
        if (beforeId == null) {
            return find("endpointId = ?1 order by id desc", endpointId).page(0, limit).list();
        }
        return find("endpointId = ?1 and id < ?2 order by id desc", endpointId, beforeId).page(0, limit).list();
    }

    public static List<WebhookDeliveryEntity> listByEvent(UUID eventId) {
        return list("eventId = ?1 order by id", eventId);
    }
}
