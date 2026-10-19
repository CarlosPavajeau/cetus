package com.cantte.cetus.api.documents;

import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * How the document reached its customer. SKIPPED, BOUNCED, COMPLAINED or FAILED mean it did not: the
 * integrator has to deliver it by its own means.
 */
public record DeliveryView(
        @Schema(required = true) UUID id,
        @Schema(required = true) DocumentDeliveryEntity.Channel channel,
        @Schema(required = true, nullable = true) String recipient,
        @Schema(required = true) DocumentDeliveryEntity.Status status,
        @Schema(required = true, nullable = true) String error,
        @Schema(required = true, nullable = true) OffsetDateTime sentAt,
        @Schema(required = true, nullable = true) OffsetDateTime lastEventAt) {

    public static List<DeliveryView> of(UUID documentId) {
        return DocumentDeliveryEntity.listByDocument(documentId).stream()
                .map(d -> new DeliveryView(d.id, d.channel, d.recipient, d.status, d.error, d.sentAt, d.lastEventAt))
                .toList();
    }
}
