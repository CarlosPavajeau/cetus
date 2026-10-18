package com.cantte.cetus.api.console;

import com.cantte.cetus.api.error.ApiError;
import com.cantte.cetus.api.openapi.OpenApiFilter;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditEntryView;
import com.cantte.cetus.persistence.audit.AuditLog;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Activity of the account behind the active organization, newest first. */
@Path("/console/audit-log")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(responseCode = "400", description = "Bad Request",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
@APIResponse(responseCode = "404", description = "Not Found",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
@APIResponse(responseCode = "422", description = "Unprocessable Entity",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
public class AuditLogResource {

    @Inject
    ConsoleContext context;
    @Inject
    AuditLog auditLog;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public AuditPage list(@QueryParam("action") String action,
                          @QueryParam("before") Long before,
                          @QueryParam("limit") @DefaultValue("50") int limit) {
        return AuditPage.from(auditLog.list(context.account().id, parseAction(action), before, limit));
    }

    @GET
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public AuditEntry get(@PathParam("id") long id) {
        return auditLog.find(context.account().id, id).map(AuditEntry::from)
                .orElseThrow(() -> new NotFoundException("Audit entry not found"));
    }

    private static AuditAction parseAction(String action) {
        if (action == null || action.isBlank()) {
            return null;
        }
        try {
            return AuditAction.valueOf(action);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown action " + action);
        }
    }

    /** Same JSON as the persistence page; declared here so the OpenAPI spec can mark required fields. */
    public record AuditPage(@Schema(required = true) List<AuditEntry> items,
                            @Schema(required = true, nullable = true) Long nextCursor) {
        static AuditPage from(com.cantte.cetus.persistence.audit.AuditPage page) {
            return new AuditPage(page.items().stream().map(AuditEntry::from).toList(), page.nextCursor());
        }
    }

    public record AuditEntry(
            @Schema(required = true) long id,
            @Schema(required = true) AuditAction action,
            @Schema(required = true) Actor.ActorType actorType,
            @Schema(required = true, nullable = true) String actorId,
            @Schema(required = true, nullable = true) String resourceType,
            @Schema(required = true, nullable = true) UUID resourceId,
            @Schema(required = true, additionalProperties = AuditValue.class) Map<String, Object> data,
            @Schema(required = true, nullable = true) String ipAddress,
            @Schema(required = true) OffsetDateTime createdAt) {
        static AuditEntry from(AuditEntryView entry) {
            return new AuditEntry(entry.id(), entry.action(), entry.actorType(), entry.actorId(),
                    entry.resourceType(), entry.resourceId(), entry.data(), entry.ipAddress(), entry.createdAt());
        }
    }

    /**
     * Documents the values of {@link AuditEntry#data}: flat metadata, never nested objects. Values may be null;
     * annotations cannot express that inside {@code oneOf}, so {@link OpenApiFilter} adds it.
     */
    @Schema(name = "AuditValue", oneOf = {String.class, Number.class, Boolean.class})
    interface AuditValue {
    }
}
