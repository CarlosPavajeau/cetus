package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.Environment;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
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

    /** The active endpoints of the account and environment that receive the event type. */
    public static List<WebhookEndpointEntity> listSubscribed(UUID accountId, Environment environment, String eventType) {
        List<WebhookEndpointEntity> active = list("accountId = ?1 and environment = ?2 and status = ?3 order by id",
                accountId, environment, Status.ACTIVE);
        return active.stream().filter(endpoint -> endpoint.receives(eventType)).toList();
    }
}
