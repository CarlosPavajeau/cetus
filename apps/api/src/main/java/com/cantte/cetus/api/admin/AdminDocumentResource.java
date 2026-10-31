package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.Map;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** What the Cetus team resolves about a document of an account. */
@Path("/admin/documents/{documentId}")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "404",
        description = "Not Found",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "422",
        description = "Unprocessable Entity",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminDocumentResource {

    public record ReleaseRequest(
            @NotBlank @Size(min = 3, max = 500) String reason) {}

    @Inject
    CreditLedger ledger;

    @Inject
    AdminCreditResource credits;

    @Inject
    AuditLog auditLog;

    @Inject
    ConsoleContext context;

    @Inject
    RequestOriginResolver origin;

    /**
     * Gives back the credit of a production document the worker gave up on, once the team knows the DIAN never
     * accepted it. Locked like the worker locks it, so a late verdict and this never both act on it.
     */
    @POST
    @Path("/credit-release")
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public AdminCreditResource.CreditsView release(
            @PathParam("documentId") UUID id, @Valid @NotNull ReleaseRequest request) {
        DocumentEntity doc = DocumentEntity.lock(id);
        if (doc == null || doc.environment != Environment.LIVE) {
            throw new NotFoundException("Document not found");
        }
        boolean dead = JobEntity.count(
                        "jobType = ?1 and referenceId = ?2 and status = 'DEAD'", JobTypes.PROCESS_DOCUMENT, doc.id)
                > 0;
        if (doc.status != DocumentStatus.FAILED || !dead) {
            throw new DomainException(
                    "document_not_dead", "Only a document whose processing died can be resolved as not issued");
        }
        String reason = request.reason().strip();
        ledger.release(doc.id, context.platformActor(), reason);
        auditLog.record(
                doc.accountId,
                context.platformActor(),
                origin.resolve(),
                AuditAction.DOCUMENT_CREDIT_RELEASED,
                "document",
                doc.id,
                Map.of("reason", reason));
        return credits.view(doc.accountId);
    }
}
