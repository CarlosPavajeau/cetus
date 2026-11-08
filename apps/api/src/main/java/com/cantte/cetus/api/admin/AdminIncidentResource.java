package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.status.PlatformStatus;
import com.cantte.cetus.api.status.StatusViews.IncidentRequest;
import com.cantte.cetus.api.status.StatusViews.IncidentView;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.AfterCommit;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.StatusIncidentEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** Incidents the Cetus team publishes on the status page and in the console while something fails. */
@Path("/admin/incidents")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminIncidentResource {

    static final int PAGE_SIZE = 50;

    @Inject
    ConsoleContext context;

    @Inject
    RequestOriginResolver origin;

    @Inject
    AuditLog auditLog;

    @Inject
    PlatformStatus platformStatus;

    @Inject
    AfterCommit afterCommit;

    @GET
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public List<IncidentView> list() {
        return StatusIncidentEntity.page(PAGE_SIZE).stream()
                .map(IncidentView::from)
                .toList();
    }

    @POST
    @Transactional
    @Consumes(MediaType.APPLICATION_JSON)
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "422",
            description = "Unprocessable Entity",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public IncidentView open(@Valid @NotNull IncidentRequest request) {
        Actor actor = context.platformActor();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        StatusIncidentEntity incident = new StatusIncidentEntity();
        incident.id = Ids.newId();
        incident.startedAt = now;
        incident.createdBy = actor.id();
        apply(incident, request, now);
        incident.persist();
        record(actor, AuditAction.STATUS_INCIDENT_OPENED, incident);
        return IncidentView.from(incident);
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @Consumes(MediaType.APPLICATION_JSON)
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
    public IncidentView update(@PathParam("id") UUID id, @Valid @NotNull IncidentRequest request) {
        StatusIncidentEntity incident = open(id);
        apply(incident, request, OffsetDateTime.now(ZoneOffset.UTC));
        record(context.platformActor(), AuditAction.STATUS_INCIDENT_UPDATED, incident);
        return IncidentView.from(incident);
    }

    @POST
    @Path("/{id}/resolve")
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
    public IncidentView resolve(@PathParam("id") UUID id) {
        StatusIncidentEntity incident = open(id);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        incident.resolvedAt = now;
        incident.updatedAt = now;
        record(context.platformActor(), AuditAction.STATUS_INCIDENT_RESOLVED, incident);
        return IncidentView.from(incident);
    }

    private static StatusIncidentEntity open(UUID id) {
        // Locked, so a resolution and an edit at once never both pass the check below.
        StatusIncidentEntity incident = StatusIncidentEntity.<StatusIncidentEntity>findByIdOptional(
                        id, LockModeType.PESSIMISTIC_WRITE)
                .orElseThrow(() -> new NotFoundException("Incident not found"));
        if (incident.resolvedAt != null) {
            throw new DomainException("incident_resolved", "The incident is already resolved");
        }
        return incident;
    }

    private static void apply(StatusIncidentEntity incident, IncidentRequest request, OffsetDateTime now) {
        incident.component = request.component();
        incident.impact = request.impact();
        incident.title = request.title().strip();
        incident.message = request.message().strip();
        incident.updatedAt = now;
    }

    private void record(Actor actor, AuditAction action, StatusIncidentEntity incident) {
        auditLog.record(
                null,
                actor,
                origin.resolve(),
                action,
                "status_incident",
                incident.id,
                Map.of(
                        "component", incident.component.name(),
                        "impact", incident.impact.name(),
                        "title", incident.title));
        afterCommit.run(platformStatus::invalidate);
    }
}
