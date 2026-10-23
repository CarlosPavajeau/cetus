package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.Environment;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.generator.EventType;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** A URL of the integrator that receives the events of its documents in one environment. */
@Entity
@Table(name = "webhook_endpoints")
public class WebhookEndpointEntity extends PanacheEntityBase {

    public enum Status { ACTIVE, DISABLED }

    /** Who disabled the endpoint: a console user, or Cetus after it kept failing. */
    public enum DisabledReason { MANUAL, AUTOMATIC }

    @Id
    public UUID id;
    @Column(name = "account_id")
    public UUID accountId;
    @Enumerated(EnumType.STRING)
    public Environment environment;
    public String url;
    public String description;
    /** Wire names of the events it receives; empty means all of them. */
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "event_types")
    public String[] eventTypes = new String[0];
    /** The whsec_ signing secret, sealed with SecretCipher. */
    @Column(name = "secret_sealed")
    public byte[] secretSealed;
    @Enumerated(EnumType.STRING)
    public Status status = Status.ACTIVE;
    @Column(name = "disabled_at")
    public OffsetDateTime disabledAt;
    @Enumerated(EnumType.STRING)
    @Column(name = "disabled_reason")
    public DisabledReason disabledReason;
    /** Failed attempts since the last 2xx. */
    @Column(name = "consecutive_failures")
    public int consecutiveFailures;
    /** When the current streak of failures started; null while the endpoint answers. */
    @Column(name = "failing_since")
    public OffsetDateTime failingSince;
    /** Better Auth user id of the creator. */
    @Column(name = "created_by")
    public String createdBy;
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

    public boolean receives(String eventType) {
        return eventTypes == null || eventTypes.length == 0 || Arrays.asList(eventTypes).contains(eventType);
    }

    public static Optional<WebhookEndpointEntity> findForAccount(UUID accountId, UUID id) {
        return find("id = ?1 and accountId = ?2", id, accountId).firstResultOptional();
    }

    public static List<WebhookEndpointEntity> listByAccount(UUID accountId) {
        return list("accountId = ?1 order by createdAt desc, id desc", accountId);
    }

    /** The endpoint, locked until the transaction ends: enabling it waits for the events being published. */
    public static Optional<WebhookEndpointEntity> findForAccountForUpdate(UUID accountId, UUID id) {
        return find("id = ?1 and accountId = ?2", id, accountId).withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    /**
     * The active endpoints of the account and environment that receive the event type. Every endpoint of the
     * account and environment is share-locked, disabled ones too, so the event and the endpoint's enabling
     * never pass each other: an endpoint being enabled is seen once enabled, and enabling one waits for the
     * events being published, so it can send them again.
     */
    public static List<WebhookEndpointEntity> listSubscribed(UUID accountId, Environment environment, String eventType) {
        List<WebhookEndpointEntity> endpoints = find("accountId = ?1 and environment = ?2 order by id", accountId, environment)
                .withLock(LockModeType.PESSIMISTIC_READ).list();
        return endpoints.stream()
                .filter(endpoint -> endpoint.status == Status.ACTIVE && endpoint.receives(eventType))
                .toList();
    }
}
