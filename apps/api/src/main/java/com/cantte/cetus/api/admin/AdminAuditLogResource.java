package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.console.AuditLogResource.AuditValue;
import com.cantte.cetus.api.error.ProblemDetail;
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
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** The audit log of every account (and of actions on no account, such as banning a user), newest first. */
@Path("/admin/audit-log")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "400",
        description = "Bad Request",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminAuditLogResource {

    @Inject
    AuditLog auditLog;

    @GET
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public AdminAuditPage list(
            @QueryParam("accountId") UUID accountId,
            @QueryParam("action") String action,
            @QueryParam("actorId") String actorId,
            @QueryParam("before") Long before,
            @QueryParam("limit") @DefaultValue("50") int limit) {
        var page = auditLog.listAll(
                accountId, parseAction(action), actorId == null || actorId.isBlank() ? null : actorId, before, limit);
        List<UUID> accountIds = page.items().stream()
                .map(AuditEntryView::accountId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<UUID, String> names = accountIds.isEmpty()
                ? Map.of()
                : AccountEntity.<AccountEntity>list("id in ?1", accountIds).stream()
                        .collect(Collectors.toMap(account -> account.id, account -> account.name));
        return new AdminAuditPage(
                page.items().stream()
                        .map(entry -> AdminAuditEntry.from(
                                entry, entry.accountId() == null ? null : names.get(entry.accountId())))
                        .toList(),
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

    public record AdminAuditPage(
            List<AdminAuditEntry> items,
            @Schema(nullable = true) Long nextCursor) {}

    public record AdminAuditEntry(
            long id,
            @Schema(nullable = true) UUID accountId,
            @Schema(nullable = true) String accountName,
            AuditAction action,
            Actor.ActorType actorType,
            @Schema(nullable = true) String actorId,
            @Schema(nullable = true) String impersonatedBy,
            @Schema(nullable = true) String resourceType,
            @Schema(nullable = true) UUID resourceId,

            @Schema(additionalProperties = AuditValue.class) Map<String, Object> data,

            @Schema(nullable = true) String ipAddress,
            OffsetDateTime createdAt) {
        static AdminAuditEntry from(AuditEntryView entry, String accountName) {
            return new AdminAuditEntry(
                    entry.id(),
                    entry.accountId(),
                    accountName,
                    entry.action(),
                    entry.actorType(),
                    entry.actorId(),
                    entry.impersonatedBy(),
                    entry.resourceType(),
                    entry.resourceId(),
                    entry.data(),
                    entry.ipAddress(),
                    entry.createdAt());
        }
    }
}
