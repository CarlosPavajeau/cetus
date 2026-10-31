package com.cantte.cetus.api.email;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.email.ResendWebhookVerifier;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity;
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
import java.io.IOException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;

/**
 * Resend's delivery events (webhook). Only accepted with a valid signature from the endpoint secret
 * (RESEND_WEBHOOK_SECRET). The events that move a delivery are stored once each, keyed by their svix-id, and
 * acted on by the worker (PROCESS_WEBHOOK_EVENT); any other type is acknowledged and dropped.
 */
@Path("/internal/email-events")
public class EmailEventResource {

    /** The delivery outcomes the worker records; Resend may send other types if the webhook subscribes to them. */
    static final Set<String> HANDLED = Set.of("email.delivered", "email.bounced", "email.complained", "email.failed");

    @Inject
    ObjectMapper json;

    @Inject
    JobQueue jobs;

    private final Optional<ResendWebhookVerifier> verifier;

    public EmailEventResource(@ConfigProperty(name = "cetus.email.webhook-secret") Optional<String> secret) {
        this.verifier = secret.filter(s -> !s.isBlank()).map(ResendWebhookVerifier::new);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(hidden = true)
    public Response receive(
            @HeaderParam("svix-id") String id,
            @HeaderParam("svix-timestamp") String timestamp,
            @HeaderParam("svix-signature") String signature,
            String body)
            throws IOException {
        if (verifier.isEmpty()) {
            return error(
                    Response.Status.SERVICE_UNAVAILABLE, "webhook_not_configured", "RESEND_WEBHOOK_SECRET is not set");
        }
        if (!verifier.get().verify(id, timestamp, signature, body)) {
            return error(Response.Status.UNAUTHORIZED, "invalid_signature", "The webhook signature is not valid");
        }
        String type = json.readTree(body).path("type").asText();
        if (HANDLED.contains(type)) {
            QuarkusTransaction.requiringNew().run(() -> {
                Optional<UUID> stored =
                        InboundWebhookEventEntity.record(InboundWebhookEventEntity.Provider.RESEND, id, type, body);
                stored.ifPresent(eventId -> jobs.enqueue(JobTypes.PROCESS_WEBHOOK_EVENT, eventId));
            });
        }
        return Response.ok().build();
    }

    private static Response error(Response.Status status, String code, String message) {
        return ProblemDetail.response(status.getStatusCode(), code, message);
    }
}
