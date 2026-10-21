package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.auth.ApiKeys;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.console.IssuerOnboardingService;
import com.cantte.cetus.api.console.IssuerViews;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.CertificateUploadLinkEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

/**
 * Setup steps the Cetus team does for a customer (software credentials, numbering ranges), through the
 * same onboarding service as the console and audited with the team member as the actor. The certificate
 * is never handled here: the team sends a one-time link and the customer uploads it.
 */
@Path("/admin/accounts/{accountId}/issuers/{issuerId}")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(responseCode = "400", description = "Bad Request",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(responseCode = "403", description = "Forbidden",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(responseCode = "404", description = "Not Found",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(responseCode = "422", description = "Unprocessable Entity",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
public class AdminIssuerResource {

    static final Duration LINK_LIFETIME = Duration.ofHours(48);
    private static final SecureRandom RANDOM = new SecureRandom();

    @Inject
    ConsoleContext context;
    @Inject
    IssuerOnboardingService onboarding;
    @Inject
    AuditLog auditLog;
    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public IssuerViews.IssuerDetailView get(@PathParam("accountId") UUID accountId,
                                            @PathParam("issuerId") UUID issuerId) {
        return IssuerViews.IssuerDetailView.from(issuer(accountId, issuerId));
    }

    @PUT
    @Path("/software")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public IssuerViews.IssuerDetailView setSoftware(@PathParam("accountId") UUID accountId,
                                                    @PathParam("issuerId") UUID issuerId,
                                                    @Valid @NotNull IssuerViews.SoftwareRequest request) {
        IssuerEntity issuer = issuer(accountId, issuerId);
        onboarding.setSoftware(issuer, request, context.platformActor(), origin.resolve());
        return IssuerViews.IssuerDetailView.from(issuer);
    }

    @POST
    @Path("/numbering-ranges")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public IssuerViews.NumberingRangeView addRange(@PathParam("accountId") UUID accountId,
                                                   @PathParam("issuerId") UUID issuerId,
                                                   @Valid @NotNull IssuerViews.NumberingRangeRequest request) {
        return IssuerViews.NumberingRangeView.from(onboarding.addRange(issuer(accountId, issuerId), request,
                context.platformActor(), origin.resolve()));
    }

    /** A new link for the customer to upload the certificate; earlier unused links of the issuer stop working. */
    @POST
    @Path("/certificate-upload-links")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public CertificateUploadLinkView createUploadLink(@PathParam("accountId") UUID accountId,
                                                      @PathParam("issuerId") UUID issuerId) {
        // Locked so two links created at once cannot both survive: each expires the other's in turn.
        IssuerEntity issuer = IssuerEntity.findForAccountForUpdate(accountId, issuerId)
                .orElseThrow(() -> new NotFoundException("Issuer not found"));
        byte[] secret = new byte[32];
        RANDOM.nextBytes(secret);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(secret);

        CertificateUploadLinkEntity.expireUnused(issuer.id);
        CertificateUploadLinkEntity link = new CertificateUploadLinkEntity();
        link.id = Ids.newId();
        link.accountId = issuer.accountId;
        link.issuerId = issuer.id;
        link.tokenHash = ApiKeys.hash(token);
        link.createdBy = context.userId();
        link.expiresAt = OffsetDateTime.now().plus(LINK_LIFETIME);
        link.persist();
        auditLog.record(issuer.accountId, context.platformActor(), origin.resolve(),
                AuditAction.CERTIFICATE_UPLOAD_LINK_CREATED, "issuer", issuer.id,
                Map.of("linkId", link.id.toString(), "expiresAt", link.expiresAt.toString()));
        return new CertificateUploadLinkView(token, link.expiresAt);
    }

    private static IssuerEntity issuer(UUID accountId, UUID issuerId) {
        return IssuerEntity.findForAccount(accountId, issuerId)
                .orElseThrow(() -> new NotFoundException("Issuer not found"));
    }

    public record CertificateUploadLinkView(
            @Schema(required = true, description = "Shown once; only its hash is stored") String token,
            @Schema(required = true) OffsetDateTime expiresAt) {
    }
}
