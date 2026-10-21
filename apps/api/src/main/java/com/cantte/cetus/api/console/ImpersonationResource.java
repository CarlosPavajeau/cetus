package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.AccountEntity;
import io.quarkus.security.ForbiddenException;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.util.Map;

/**
 * Called with the impersonation session itself, just before the console ends it: only that session knows
 * which account and user were impersonated, and its token carries the admin in "impersonatedBy".
 */
@Path("/console/impersonation/end")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(responseCode = "403", description = "Forbidden",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class ImpersonationResource {

    @Inject
    ConsoleContext context;
    @Inject
    AuditLog auditLog;
    @Inject
    RequestOriginResolver origin;

    @POST
    @Transactional
    @APIResponse(responseCode = "204", description = "Recorded")
    public void end() {
        String admin = context.impersonatedBy().orElseThrow(ForbiddenException::new);
        String organizationId = jwtOrganization();
        AccountEntity account = organizationId == null ? null
                : AccountEntity.findByOrganization(organizationId).orElse(null);
        auditLog.record(account == null ? null : account.id, new Actor(Actor.ActorType.PLATFORM, admin),
                origin.resolve(), AuditAction.IMPERSONATION_ENDED, "user", null,
                Map.of("userId", context.userId()));
    }

    private String jwtOrganization() {
        try {
            return context.organizationId();
        } catch (RuntimeException e) {
            return null;
        }
    }
}
