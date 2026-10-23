package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.notifications.Notifications;
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
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Who receives the account's notices, per category. A new address only replaces the current one once it
 * follows the link emailed to it (ContactVerificationResource); until then the current one keeps receiving
 * them, so no notice goes to a mistyped address or gets lost in between.
 */
@Path("/console/contacts")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(responseCode = "400", description = "Bad Request",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(responseCode = "404", description = "Not Found",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(responseCode = "422", description = "Unprocessable Entity",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class ContactResource {

    /** At most one verification email per category this often, so the console cannot be used to spam an address. */
    static final Duration RESEND_AFTER = Duration.ofSeconds(60);

    @Inject
    ConsoleContext context;
    @Inject
    AccountContacts contacts;
    @Inject
    Notifications notifications;
    @Inject
    AuditLog auditLog;
    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public List<ContactView> list() {
        return AccountContactEntity.listByAccount(context.account().id).stream().map(ContactView::from).toList();
    }

    /** Asks to move the category to a new address; the same address as now cancels a pending change. */
    @PUT
    @Path("/{category}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public ContactView change(@PathParam("category") Category category, @Valid @NotNull ChangeContactRequest request) {
        AccountEntity account = context.account();
        // An account created before contacts existed starts from the member making the change.
        context.email().ifPresent(email -> contacts.seed(account.id, email));
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
        checkNotRecentlySent(contact);
        String previous = contact.pendingEmail;
        contact.clearPending();
        contact.pendingEmail = email;
        requestVerification(contact);
        Map<String, Object> data = new HashMap<>(Map.of("category", category, "email", email, "current", contact.email));
        if (previous != null) {
            data.put("replacedPending", previous);
        }
        audit(contact, AuditAction.CONTACT_CHANGE_REQUESTED, data);
        return ContactView.from(contact);
    }

    /** Emails the verification link of the pending change again; earlier links stop working. */
    @POST
    @Path("/{category}/verification")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public ContactView resendVerification(@PathParam("category") Category category) {
        AccountContactEntity contact = AccountContacts.require(context.account().id, category);
        if (contact.pendingEmail == null) {
            throw new DomainException("no_pending_change", "The contact has no change waiting for verification");
        }
        checkNotRecentlySent(contact);
        contact.pendingTokenHash = null;
        contact.pendingExpiresAt = null;
        requestVerification(contact);
        return ContactView.from(contact);
    }

    @DELETE
    @Path("/{category}/pending")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public ContactView cancelChange(@PathParam("category") Category category) {
        AccountContactEntity contact = AccountContacts.require(context.account().id, category);
        if (contact.pendingEmail != null) {
            cancel(contact);
        }
        return ContactView.from(contact);
    }

    private static void checkNotRecentlySent(AccountContactEntity contact) {
        // Also after a cancellation: canceling and asking again must not send more than one email a minute.
        if (contact.pendingRequestedAt != null
                && contact.pendingRequestedAt.plus(RESEND_AFTER).isAfter(OffsetDateTime.now())) {
            throw new DomainException("verification_recently_sent",
                    "A verification email was just sent; wait a minute before asking for another");
        }
    }

    /** The worker makes the link when it sends the email, so the token never rests in the database. */
    private void requestVerification(AccountContactEntity contact) {
        // Milliseconds survive the round trip through the database, so the worker can tell it is this request.
        contact.pendingRequestedAt = OffsetDateTime.now().truncatedTo(ChronoUnit.MILLIS);
        notifications.request(contact.accountId, NotificationKind.CONTACT_VERIFICATION,
                "contact_verification:%s:%d".formatted(contact.id, contact.pendingRequestedAt.toInstant().toEpochMilli()),
                Map.of("contactId", contact.id.toString(), "category", contact.category.name(),
                        "email", contact.pendingEmail,
                        "requestedAt", contact.pendingRequestedAt.toInstant().toString()));
    }

    private void cancel(AccountContactEntity contact) {
        String pending = contact.pendingEmail;
        contact.clearPending();
        audit(contact, AuditAction.CONTACT_CHANGE_CANCELED, Map.of("category", contact.category, "email", pending));
    }

    private void audit(AccountContactEntity contact, AuditAction action, Map<String, Object> data) {
        auditLog.record(contact.accountId, context.actor(), origin.resolve(), action, "account_contact", contact.id, data);
    }

    public record ChangeContactRequest(@NotBlank @Email @Size(max = 254) String email) {
    }

    public record ContactView(
            @Schema(required = true) UUID id,
            @Schema(required = true) Category category,
            @Schema(required = true, description = "The verified address that receives the notices") String email,
            @Schema(required = true) OffsetDateTime verifiedAt,
            @Schema(required = true, nullable = true, description = "A new address waiting for its verification")
            String pendingEmail,
            @Schema(required = true, nullable = true) OffsetDateTime pendingRequestedAt) {
        static ContactView from(AccountContactEntity contact) {
            return new ContactView(contact.id, contact.category, contact.email, contact.verifiedAt,
                    contact.pendingEmail, contact.pendingEmail == null ? null : contact.pendingRequestedAt);
        }
    }
}
