package com.cantte.cetus.api.documents;

import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * How the document reached its customer. SKIPPED, BOUNCED, COMPLAINED or FAILED mean it did not: the
 * integrator has to deliver it by its own means.
 */
public record DeliveryView(
        UUID id,
        DocumentDeliveryEntity.Channel channel,
        @Schema(nullable = true) String recipient,
        DocumentDeliveryEntity.Status status,
        @Schema(nullable = true) String error,
        @Schema(nullable = true) OffsetDateTime sentAt,
        @Schema(nullable = true) OffsetDateTime lastEventAt) {

    public static List<DeliveryView> of(UUID documentId) {
        return DocumentDeliveryEntity.listByDocument(documentId).stream()
                .map(d -> new DeliveryView(d.id, d.channel, d.recipient, d.status, d.error, d.sentAt, d.lastEventAt))
                .toList();
    }
}
