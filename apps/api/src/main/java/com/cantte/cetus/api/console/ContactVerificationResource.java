package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.auth.ApiKeys;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.AccountContactEntity;
import com.cantte.cetus.persistence.entity.AccountContactEntity.Category;
import com.cantte.cetus.persistence.entity.AccountEntity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.Pattern;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * The page behind a contact's verification link. No session: the token proves the address receives
 * email, so these paths are open to the console server (they stay private, like all of /console/**).
 * Opening the page does not spend the link; confirming does, so a mail scanner that follows links
 * cannot verify an address on its own.
 */
@Path("/console/contact-verifications/{token}")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(responseCode = "404", description = "Not Found",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class ContactVerificationResource {

    @Inject
    AuditLog auditLog;
    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public VerificationView get(@PathParam("token") @Pattern(regexp = CertificateUploadResource.TOKEN) String token) {
        AccountContactEntity contact = AccountContactEntity.findByPendingToken(ApiKeys.hash(token), false)
                .orElseThrow(VerificationLinkNotFound::new);
        return view(contact, contact.pendingEmail);
    }

    @POST
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public VerificationView confirm(@PathParam("token") @Pattern(regexp = CertificateUploadResource.TOKEN) String token) {
        AccountContactEntity contact = AccountContactEntity.findByPendingToken(ApiKeys.hash(token), true)
                .orElseThrow(VerificationLinkNotFound::new);
        String previous = contact.email;
        contact.email = contact.pendingEmail;
        contact.verifiedAt = OffsetDateTime.now();
        contact.clearPending();
        auditLog.record(contact.accountId, new Actor(Actor.ActorType.SYSTEM, "contact-verification-link:" + contact.id),
                origin.resolve(), AuditAction.CONTACT_VERIFIED, "account_contact", contact.id,
                Map.of("category", contact.category, "email", contact.email, "previous", previous));
        return view(contact, contact.email);
    }

    private static VerificationView view(AccountContactEntity contact, String email) {
        AccountEntity account = AccountEntity.findById(contact.accountId);
        return new VerificationView(account.name, contact.category, email);
    }

    /** Unknown, expired, replaced or already used: the page says the same for all. */
    static class VerificationLinkNotFound extends NotFoundException {
        VerificationLinkNotFound() {
            super("This link is no longer valid");
        }
    }

    public record VerificationView(
            @Schema(required = true) String accountName,
            @Schema(required = true) Category category,
            @Schema(required = true) String email) {
    }
}
