package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.AccountEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Better Auth creates the impersonation session from the console server; the API records it first, on the
 * account being entered, so its members see in their activity that the Cetus team was there and why.
 */
@Path("/admin/impersonations")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(responseCode = "400", description = "Bad Request",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(responseCode = "403", description = "Forbidden",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(responseCode = "404", description = "Not Found",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminImpersonationResource {

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
    public void start(@Valid @NotNull ImpersonationRequest request) {
        AccountEntity account = AccountEntity.findById(request.accountId());
        if (account == null) {
            throw new NotFoundException("Account not found");
        }
        auditLog.record(account.id, context.platformActor(), origin.resolve(), AuditAction.IMPERSONATION_STARTED,
                "user", null, Map.of(
                        "userId", request.userId(),
                        "email", request.email(),
                        "reason", request.reason().strip(),
                        "expiresAt", request.expiresAt().toString()));
    }

    public record ImpersonationRequest(
            @NotBlank @Pattern(regexp = AdminUserResource.USER_ID) String userId,
            @NotBlank @Size(max = 254) @Email String email,
            @NotNull UUID accountId,
            @NotBlank @Size(min = 3, max = 500) String reason,
            @NotNull OffsetDateTime expiresAt) {
    }
}
