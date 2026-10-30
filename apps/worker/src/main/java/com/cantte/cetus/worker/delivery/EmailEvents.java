package com.cantte.cetus.worker.delivery;

import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity.Status;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.webhooks.WebhookEventType;
import com.cantte.cetus.webhooks.WebhookPublisher;
import com.cantte.cetus.webhooks.WebhookPublisher.DeliveryInfo;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Optional;

/** Moves the delivery that sent an email as Resend's delivery events say. */
@ApplicationScoped
public class EmailEvents {

    @Inject
    ObjectMapper json;

    @Inject
    WebhookPublisher webhooks;

    /**
     * Applies the event to the delivery of its email.
     *
     * @return false when no delivery sent the email: another environment's, or one sent before the delivery was
     *     recorded
     */
    @Transactional
    public boolean apply(String payload) throws IOException {
        JsonNode event = json.readTree(payload);
        Status status = switch (event.path("type").asText()) {
            case "email.delivered" -> Status.DELIVERED;
            case "email.bounced" -> Status.BOUNCED;
            case "email.complained" -> Status.COMPLAINED;
            case "email.failed" -> Status.FAILED;
            default -> null;
        };
        String emailId = event.path("data").path("email_id").asText(null);
        if (status == null || emailId == null) {
            return false;
        }
        Optional<DocumentDeliveryEntity> found = DocumentDeliveryEntity.findByProviderMessageId(emailId);
        if (found.isEmpty()) {
            return false;
        }
        DocumentDeliveryEntity delivery = found.get();
        String reason = reason(event);
        // Events can arrive out of order: a late "delivered" never hides a bounce or a complaint.
        boolean downgrade = status == Status.DELIVERED
                && (delivery.status == Status.BOUNCED
                        || delivery.status == Status.COMPLAINED
                        || delivery.status == Status.FAILED);
        boolean changed = !downgrade && delivery.status != status;
        if (!downgrade) {
            delivery.status = status;
            if (reason != null) {
                delivery.error = reason;
            }
        }
        if (changed) {
            // Same transaction as the change; a repeated event changes nothing and publishes nothing.
            webhooks.publish(
                    status == Status.DELIVERED
                            ? WebhookEventType.DOCUMENT_DELIVERED
                            : WebhookEventType.DOCUMENT_DELIVERY_FAILED,
                    DocumentEntity.findById(delivery.documentId),
                    new DeliveryInfo(status.name(), delivery.recipient, delivery.error));
        }
        OffsetDateTime at = occurredAt(event);
        if (delivery.lastEventAt == null || at.isAfter(delivery.lastEventAt)) {
            delivery.lastEventAt = at;
        }
        return true;
    }

    private static String reason(JsonNode event) {
        JsonNode bounce = event.path("data").path("bounce");
        if (!bounce.isMissingNode()) {
            return bounce.path("message").asText(bounce.path("type").asText(null));
        }
        JsonNode failed = event.path("data").path("failed");
        return failed.isMissingNode() ? null : failed.path("reason").asText(null);
    }

    private static OffsetDateTime occurredAt(JsonNode event) {
        try {
            return OffsetDateTime.parse(event.path("created_at").asText());
        } catch (DateTimeParseException e) {
            return OffsetDateTime.now();
        }
    }
}
