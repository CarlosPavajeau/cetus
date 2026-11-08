package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity.Provider;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity.Status;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** Provider events (Wompi, Resend) the worker gave up on, for the Cetus team to look at and queue again. */
@Path("/admin/inbound-events")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminInboundEventResource {

    static final int PAGE_SIZE = 50;

    public record InboundEventView(
            UUID id,
            Provider provider,
            String eventType,
            Status status,
            int attempts,
            @Schema(nullable = true) String error,
            OffsetDateTime receivedAt,
            @Schema(nullable = true) OffsetDateTime processedAt) {

        static InboundEventView from(InboundWebhookEventEntity event) {
            return new InboundEventView(
                    event.id,
                    event.provider,
                    event.eventType,
                    event.status,
                    event.attempts,
                    event.error,
                    event.receivedAt,
                    event.processedAt);
        }
    }

    @Inject
    ConsoleContext context;

    @Inject
    RequestOriginResolver origin;

    @Inject
    AuditLog auditLog;

    @Inject
    JobQueue jobs;

    @GET
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public List<InboundEventView> failed() {
        return InboundWebhookEventEntity.<InboundWebhookEventEntity>find(
                        "status = ?1 order by receivedAt desc", Status.FAILED)
                .page(0, PAGE_SIZE)
                .list()
                .stream()
                .map(InboundEventView::from)
                .toList();
    }

    /** Back to RECEIVED and queued once more; only a failed event, so a processed one never runs twice. */
    @POST
    @Path("/{id}/requeue")
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "404",
            description = "Not Found",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "422",
            description = "Unprocessable Entity",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public InboundEventView requeue(@PathParam("id") UUID id) {
        InboundWebhookEventEntity event = InboundWebhookEventEntity.<InboundWebhookEventEntity>findByIdOptional(
                        id, LockModeType.PESSIMISTIC_WRITE)
                .orElseThrow(() -> new NotFoundException("Event not found"));
        if (event.status != Status.FAILED) {
            throw new DomainException(
                    "event_not_failed", "Only a failed event can be queued again; this one is " + event.status);
        }
        String error = event.error;
        event.status = Status.RECEIVED;
        event.error = null;
        event.processedAt = null;
        // A run of the earlier generation, still going after its job was given up, cannot resolve it any more.
        event.generation++;
        jobs.enqueue(JobTypes.PROCESS_WEBHOOK_EVENT, event.id);
        auditLog.record(
                null,
                context.platformActor(),
                origin.resolve(),
                AuditAction.INBOUND_EVENT_REQUEUED,
                "inbound_webhook_event",
                event.id,
                Map.of(
                        "provider",
                        event.provider.name(),
                        "eventType",
                        event.eventType,
                        "error",
                        error == null ? "" : error));
        return InboundEventView.from(event);
    }
}
