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
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Hand-over of a validated document (AttachedDocument + PDF) to its customer. */
@Entity
@Table(name = "document_deliveries")
public class DocumentDeliveryEntity extends PanacheEntityBase {

    public enum Channel {
        EMAIL
    }

    /**
     * PENDING until the provider takes the email (SENT); its webhook then reports DELIVERED, BOUNCED or
     * COMPLAINED. SKIPPED (nothing to send to) and FAILED (the provider refused it) tell the integrator to
     * deliver the document by other means.
     */
    @Schema(name = "DeliveryStatus")
    public enum Status {
        PENDING,
        SENT,
        DELIVERED,
        BOUNCED,
        COMPLAINED,
        SKIPPED,
        FAILED;

        /** The delivery left Cetus; only the provider's events change it from here. */
        public boolean handedOver() {
            return this == SENT || this == DELIVERED || this == BOUNCED || this == COMPLAINED;
        }
    }

    @Id
    public UUID id;

    @Column(name = "document_id")
    public UUID documentId;

    @Enumerated(EnumType.STRING)
    public Channel channel = Channel.EMAIL;

    public String recipient;

    @Enumerated(EnumType.STRING)
    public Status status = Status.PENDING;

    public int attempts;

    @Column(name = "provider_message_id")
    public String providerMessageId;

    public String error;

    @Column(name = "sent_at")
    public OffsetDateTime sentAt;

    @Column(name = "last_event_at")
    public OffsetDateTime lastEventAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public static List<DocumentDeliveryEntity> listByDocument(UUID documentId) {
        return list("documentId = ?1 order by createdAt, id", documentId);
    }

    /** The delivery still to be sent, if any: retries of the job reuse it and its idempotency key. */
    public static Optional<DocumentDeliveryEntity> findPending(UUID documentId) {
        return find("documentId = ?1 and status = ?2 order by createdAt desc, id desc", documentId, Status.PENDING)
                .firstResultOptional();
    }

    public static Optional<DocumentDeliveryEntity> findByProviderMessageId(String providerMessageId) {
        return find("providerMessageId", providerMessageId).firstResultOptional();
    }
}
