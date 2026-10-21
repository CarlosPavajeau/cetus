package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.console.AuditLogResource.AuditValue;
import com.cantte.cetus.api.error.ApiError;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditEntryView;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.AccountEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/** The audit log of every account (and of actions on no account, such as banning a user), newest first. */
@Path("/admin/audit-log")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(responseCode = "400", description = "Bad Request",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
@APIResponse(responseCode = "403", description = "Forbidden",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
public class AdminAuditLogResource {

    @Inject
    AuditLog auditLog;

    @GET
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public AdminAuditPage list(@QueryParam("accountId") UUID accountId,
                               @QueryParam("action") String action,
                               @QueryParam("actorId") String actorId,
                               @QueryParam("before") Long before,
                               @QueryParam("limit") @DefaultValue("50") int limit) {
        var page = auditLog.listAll(accountId, parseAction(action),
                actorId == null || actorId.isBlank() ? null : actorId, before, limit);
        List<UUID> accountIds = page.items().stream().map(AuditEntryView::accountId).filter(Objects::nonNull)
                .distinct().toList();
        Map<UUID, String> names = accountIds.isEmpty() ? Map.of()
                : AccountEntity.<AccountEntity>list("id in ?1", accountIds).stream()
                .collect(Collectors.toMap(account -> account.id, account -> account.name));
        return new AdminAuditPage(page.items().stream()
                .map(entry -> AdminAuditEntry.from(entry, names.get(entry.accountId()))).toList(),
                page.nextCursor());
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

    public record AdminAuditPage(@Schema(required = true) List<AdminAuditEntry> items,
                                 @Schema(required = true, nullable = true) Long nextCursor) {
    }

    public record AdminAuditEntry(
            @Schema(required = true) long id,
            @Schema(required = true, nullable = true) UUID accountId,
            @Schema(required = true, nullable = true) String accountName,
            @Schema(required = true) AuditAction action,
            @Schema(required = true) Actor.ActorType actorType,
            @Schema(required = true, nullable = true) String actorId,
            @Schema(required = true, nullable = true) String resourceType,
            @Schema(required = true, nullable = true) UUID resourceId,
            @Schema(required = true, additionalProperties = AuditValue.class) Map<String, Object> data,
            @Schema(required = true, nullable = true) String ipAddress,
            @Schema(required = true) OffsetDateTime createdAt) {
        static AdminAuditEntry from(AuditEntryView entry, String accountName) {
            return new AdminAuditEntry(entry.id(), entry.accountId(), accountName, entry.action(), entry.actorType(),
                    entry.actorId(), entry.resourceType(), entry.resourceId(), entry.data(), entry.ipAddress(),
                    entry.createdAt());
        }
    }
}
