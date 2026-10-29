package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.AccountContactEntity;
import com.cantte.cetus.persistence.entity.AccountContactEntity.Category;
import com.cantte.cetus.persistence.entity.AccountEntity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * Who receives the account's notices, per category. A new address only replaces the current one once it
 * follows the link emailed to it (ContactVerificationResource); until then the current one keeps receiving
 * them, so no notice goes to a mistyped address or gets lost in between.
 */
@Path("/console/contacts")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "400",
        description = "Bad Request",
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
public class ContactResource {

    @Inject
    ConsoleContext context;

    @Inject
    AccountContacts contacts;

    @Inject
    AuditLog auditLog;

    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public List<ContactView> list() {
        return AccountContactEntity.listByAccount(context.accountId()).stream()
                .map(ContactView::from)
                .toList();
    }

    /** Asks to move the category to a new address; the same address as now cancels a pending change. */
    @PUT
    @Path("/{category}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public ContactView change(@PathParam("category") Category category, @Valid @NotNull ChangeContactRequest request) {
        AccountEntity account = context.account();
        // An account created before contacts existed gets its categories now, without an address.
        contacts.ensure(account.id);
        AccountContactEntity contact = AccountContacts.require(account.id, category);
        String email = AccountContacts.normalize(request.email());
        if (email.equals(contact.email)) {
            if (contact.pendingEmail != null) {
                cancel(contact);
            }
            return ContactView.from(contact);
        }
        if (email.equals(contact.pendingEmail)) {
            return ContactView.from(contact);
        }
        contacts.checkNotRecentlySent(account.id, email);
        String previous = contact.pendingEmail;
        contacts.leaveRequest(contact);
        contact.pendingEmail = email;
        contact.pendingRequestedAt = AccountContacts.now();
        contacts.requestVerification(contact, List.of(category));
        Map<String, Object> data = new HashMap<>(Map.of("category", category, "email", email));
        if (contact.email != null) {
            data.put("current", contact.email);
        }
        if (previous != null) {
            data.put("replacedPending", previous);
        }
        audit(contact, AuditAction.CONTACT_CHANGE_REQUESTED, data);
        return ContactView.from(contact);
    }

    /**
     * Emails the verification link of the pending change again; earlier links stop working. The categories
     * waiting for the same address since the same request get the new link too.
     */
    @POST
    @Path("/{category}/verification")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public ContactView resendVerification(@PathParam("category") Category category) {
        AccountContactEntity contact = AccountContacts.require(context.accountId(), category);
        if (contact.pendingEmail == null) {
            throw new DomainException("no_pending_change", "The contact has no change waiting for verification");
        }
        contacts.checkNotRecentlySent(contact.accountId, contact.pendingEmail);
        List<AccountContactEntity> same = AccountContacts.sameRequest(contact);
        contact.pendingRequestedAt = AccountContacts.now();
        for (AccountContactEntity other : same) {
            other.pendingTokenHash = null;
            other.pendingExpiresAt = null;
            other.pendingRequestedAt = contact.pendingRequestedAt;
        }
        List<Category> categories = new ArrayList<>(List.of(category));
        same.forEach(other -> categories.add(other.category));
        contacts.requestVerification(contact, categories);
        return ContactView.from(contact);
    }

    @DELETE
    @Path("/{category}/pending")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public ContactView cancelChange(@PathParam("category") Category category) {
        AccountContactEntity contact = AccountContacts.require(context.accountId(), category);
        if (contact.pendingEmail != null) {
            cancel(contact);
        }
        return ContactView.from(contact);
    }

    private void cancel(AccountContactEntity contact) {
        String pending = contact.pendingEmail;
        contacts.leaveRequest(contact);
        audit(contact, AuditAction.CONTACT_CHANGE_CANCELED, Map.of("category", contact.category, "email", pending));
    }

    private void audit(AccountContactEntity contact, AuditAction action, Map<String, Object> data) {
        auditLog.record(
                contact.accountId, context.actor(), origin.resolve(), action, "account_contact", contact.id, data);
    }

    public record ChangeContactRequest(
            @NotBlank @Email @Size(max = 254) String email) {}

    public record ContactView(
            UUID id,
            Category category,

            @Schema(
                    nullable = true,
                    description = "The verified address that receives the notices; null until one is verified")
            String email,

            @Schema(nullable = true) OffsetDateTime verifiedAt,

            @Schema(nullable = true, description = "A new address waiting for its verification")
            String pendingEmail,

            @Schema(nullable = true) OffsetDateTime pendingRequestedAt) {
        static ContactView from(AccountContactEntity contact) {
            return new ContactView(
                    contact.id,
                    contact.category,
                    contact.email,
                    contact.verifiedAt,
                    contact.pendingEmail,
                    contact.pendingEmail == null ? null : contact.pendingRequestedAt);
        }
    }
}
