package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.auth.ApiKeys;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.CertificateUploadLinkEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.time.OffsetDateTime;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * The page behind a one-time certificate upload link. No session: the token is the credential, so these
 * paths are open to the console server (they stay private, like all of /console/**). Whoever holds the
 * link uploads the .p12 and types its password; nothing here ever returns a certificate.
 */
@Path("/console/certificate-uploads/{token}")
@Produces(MediaType.APPLICATION_JSON)
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
public class CertificateUploadResource {

    /** Base64url of 32 random bytes. */
    static final String TOKEN = "[A-Za-z0-9_-]{43}";

    @Inject
    IssuerOnboardingService onboarding;

    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public UploadLinkView get(@PathParam("token") @Pattern(regexp = TOKEN) String token) {
        CertificateUploadLinkEntity link =
                CertificateUploadLinkEntity.findUsable(ApiKeys.hash(token)).orElseThrow(UploadLinkNotFound::new);
        IssuerEntity issuer = IssuerEntity.findById(link.issuerId);
        return new UploadLinkView(issuer.legalName, issuer.nit, issuer.environment, link.expiresAt);
    }

    /** Saves the certificate and spends the link; an invalid file or password leaves the link usable. */
    @PUT
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public UploadedCertificateView upload(
            @PathParam("token") @Pattern(regexp = TOKEN) String token,
            @Valid @NotNull IssuerViews.CertificateRequest request) {
        CertificateUploadLinkEntity link = CertificateUploadLinkEntity.findUsableForUpdate(ApiKeys.hash(token))
                .orElseThrow(UploadLinkNotFound::new);
        AccountEntity account = AccountEntity.findById(link.accountId);
        if (!"ACTIVE".equals(account.status)) {
            throw new DomainException("account_suspended", "This account is suspended");
        }
        IssuerEntity issuer = IssuerEntity.findById(link.issuerId);
        var certificate = onboarding.setCertificate(
                issuer,
                request,
                new Actor(Actor.ActorType.SYSTEM, "certificate-upload-link:" + link.id),
                origin.resolve());
        link.usedAt = OffsetDateTime.now();
        return new UploadedCertificateView(certificate.subjectDn, certificate.validTo);
    }

    /** Unknown, expired, replaced or already used: the page says the same for all. */
    static class UploadLinkNotFound extends NotFoundException {
        UploadLinkNotFound() {
            super("This link is no longer valid");
        }
    }

    public record UploadLinkView(String legalName, String nit, Environment environment, OffsetDateTime expiresAt) {}

    public record UploadedCertificateView(String subject, OffsetDateTime validTo) {}
}
