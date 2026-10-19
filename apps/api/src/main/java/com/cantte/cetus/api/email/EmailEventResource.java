package com.cantte.cetus.api.email;

import com.cantte.cetus.api.error.ApiError;
import com.cantte.cetus.email.ResendWebhookVerifier;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity.Status;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Optional;

/**
 * Resend's delivery events (webhook). Only accepted with a valid signature from the endpoint secret
 * (RESEND_WEBHOOK_SECRET); each event moves the delivery that sent the email it names.
 */
@Path("/internal/email-events")
public class EmailEventResource {

    private static final Logger LOG = Logger.getLogger(EmailEventResource.class);

    @Inject
    ObjectMapper json;

    private final Optional<ResendWebhookVerifier> verifier;

    public EmailEventResource(@ConfigProperty(name = "cetus.email.webhook-secret") Optional<String> secret) {
        this.verifier = secret.filter(s -> !s.isBlank()).map(ResendWebhookVerifier::new);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(hidden = true)
    public Response receive(@HeaderParam("svix-id") String id, @HeaderParam("svix-timestamp") String timestamp,
                            @HeaderParam("svix-signature") String signature, String body) throws IOException {
        if (verifier.isEmpty()) {
            return error(Response.Status.SERVICE_UNAVAILABLE, "webhook_not_configured", "RESEND_WEBHOOK_SECRET is not set");
        }
        if (!verifier.get().verify(id, timestamp, signature, body)) {
            return error(Response.Status.UNAUTHORIZED, "invalid_signature", "The webhook signature is not valid");
        }
        JsonNode event = json.readTree(body);
        String type = event.path("type").asText();
        String emailId = event.path("data").path("email_id").asText(null);
        Status status = switch (type) {
            case "email.delivered" -> Status.DELIVERED;
            case "email.bounced" -> Status.BOUNCED;
            case "email.complained" -> Status.COMPLAINED;
            case "email.failed" -> Status.FAILED;
            default -> null;
        };
        if (status != null && emailId != null) {
            apply(emailId, status, reason(event), occurredAt(event));
        }
        return Response.ok().build();
    }

    private static void apply(String emailId, Status status, String reason, OffsetDateTime at) {
        QuarkusTransaction.requiringNew().run(() -> {
            Optional<DocumentDeliveryEntity> found = DocumentDeliveryEntity.findByProviderMessageId(emailId);
            if (found.isEmpty()) {
                // Another environment's email, or one sent before the delivery was recorded: nothing to update.
                LOG.debugf("Email event for unknown email %s", emailId);
                return;
            }
            DocumentDeliveryEntity delivery = found.get();
            // Events can arrive out of order: a late "delivered" never hides a bounce or a complaint.
            boolean downgrade = status == Status.DELIVERED
                    && (delivery.status == Status.BOUNCED || delivery.status == Status.COMPLAINED || delivery.status == Status.FAILED);
            if (!downgrade) {
                delivery.status = status;
                if (reason != null) {
                    delivery.error = reason;
                }
            }
            if (delivery.lastEventAt == null || at.isAfter(delivery.lastEventAt)) {
                delivery.lastEventAt = at;
            }
        });
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

    private static Response error(Response.Status status, String code, String message) {
        return Response.status(status).type(MediaType.APPLICATION_JSON).entity(new ApiError(code, message, null)).build();
    }
}
