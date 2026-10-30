package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** An event received from a provider with a valid signature; see V35. */
@Entity
@Table(name = "inbound_webhook_events")
public class InboundWebhookEventEntity extends PanacheEntityBase {

    public enum Provider {
        WOMPI,
        RESEND
    }

    public enum Status {
        RECEIVED,
        PROCESSED,
        FAILED,
        /** Nothing of ours: another environment's email, a payment of no order. */
        IGNORED
    }

    @Id
    public UUID id;

    @Enumerated(EnumType.STRING)
    public Provider provider;

    @Column(name = "event_id")
    public String eventId;

    @Column(name = "event_type")
    public String eventType;

    @JdbcTypeCode(SqlTypes.JSON)
    public String payload;

    @Enumerated(EnumType.STRING)
    public Status status;

    public int attempts;

    public String error;

    @Column(name = "received_at", insertable = false, updatable = false)
    public OffsetDateTime receivedAt;

    @Column(name = "processed_at")
    public OffsetDateTime processedAt;

    /**
     * Stores the event unless the provider already sent it.
     *
     * @return the new event's id; empty for a resend
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public static Optional<UUID> record(Provider provider, String eventId, String eventType, String payload) {
        @SuppressWarnings("unchecked")
        List<UUID> inserted = getEntityManager()
                .createNativeQuery("""
                        INSERT INTO billing.inbound_webhook_events (provider, event_id, event_type, payload)
                        VALUES (:provider, :eventId, :eventType, CAST(:payload AS jsonb))
                        ON CONFLICT (provider, event_id) DO NOTHING
                        RETURNING id
                        """, UUID.class)
                .setParameter("provider", provider.name())
                .setParameter("eventId", eventId)
                .setParameter("eventType", eventType)
                .setParameter("payload", payload)
                .getResultList();
        return inserted.stream().findFirst();
    }
}
