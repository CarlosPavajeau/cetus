package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.error.ApiError;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Users live in Better Auth, which bans and unbans them (and revokes their sessions) from the console
 * server. The API only records those actions in the audit log, without an account: a person may belong
 * to several organizations.
 */
@Path("/admin/users/{userId}/ban-events")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(responseCode = "400", description = "Bad Request",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
@APIResponse(responseCode = "403", description = "Forbidden",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
public class AdminUserResource {

    /** Better Auth ids: random alphanumerics. */
    static final String USER_ID = "[A-Za-z0-9_-]{1,64}";

    @Inject
    ConsoleContext context;
    @Inject
    AuditLog auditLog;
    @Inject
    RequestOriginResolver origin;

    @POST
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "204", description = "Recorded")
    public void record(@PathParam("userId") @Pattern(regexp = USER_ID) String userId,
                       @Valid @NotNull BanEventRequest request) {
        Map<String, Object> data = new HashMap<>();
        data.put("userId", userId);
        data.put("email", request.email());
        data.put("reason", request.reason().strip());
        if (request.type() == BanEventType.BANNED) {
            data.put("expiresAt", request.expiresAt() == null ? null : request.expiresAt().toString());
        }
        auditLog.record(null, context.platformActor(), origin.resolve(),
                request.type() == BanEventType.BANNED ? AuditAction.USER_BANNED : AuditAction.USER_UNBANNED,
                "user", null, data);
    }

    public enum BanEventType { BANNED, UNBANNED }

    public record BanEventRequest(
            @NotNull BanEventType type,
            @NotBlank @Size(max = 254) @Email String email,
            @NotBlank @Size(min = 3, max = 500) String reason,
            @Schema(nullable = true, description = "When a ban ends on its own; null for an indefinite ban")
            OffsetDateTime expiresAt) {
    }
}
