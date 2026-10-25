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
@Schema(description = "Una entrega del documento a su cliente.")
public record DeliveryView(
        @Schema(description = "Identificador de la entrega.")
        UUID id,

        @Schema(description = "Canal de entrega.") DocumentDeliveryEntity.Channel channel,

        @Schema(nullable = true, description = "Destinatario.", example = "cliente@example.com")
        String recipient,

        @Schema(description = "Estado de la entrega.") DocumentDeliveryEntity.Status status,

        @Schema(nullable = true, description = "Por qué no se entregó, si no se entregó.")
        String error,

        @Schema(nullable = true, description = "Cuándo se envió.")
        OffsetDateTime sentAt,

        @Schema(nullable = true, description = "Cuándo llegó el último evento del proveedor de correo.")
        OffsetDateTime lastEventAt) {

    public static List<DeliveryView> of(UUID documentId) {
        return DocumentDeliveryEntity.listByDocument(documentId).stream()
                .map(DeliveryView::from)
                .toList();
    }

    public static DeliveryView from(DocumentDeliveryEntity d) {
        return new DeliveryView(d.id, d.channel, d.recipient, d.status, d.error, d.sentAt, d.lastEventAt);
    }
}
