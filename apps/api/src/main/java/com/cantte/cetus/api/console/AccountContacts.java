package com.cantte.cetus.api.console;

import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.notifications.Notifications;
import com.cantte.cetus.persistence.entity.AccountContactEntity;
import com.cantte.cetus.persistence.entity.AccountContactEntity.Category;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** The contacts every account starts with, and the verification emails of their changes. */
@ApplicationScoped
public class AccountContacts {

    static final Duration RESEND_AFTER = Duration.ofSeconds(60);

    @Inject
    EntityManager em;
    @Inject
    Notifications notifications;

    /**
     * Points every category without a contact to the owner's address, pending: signing up does not prove the
     * address receives email, so one link sent to it verifies them all, and no notice goes out before.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public void seedOwner(UUID accountId, String email) {
        OffsetDateTime requestedAt = now();
        List<Category> seeded = new ArrayList<>();
        for (Category category : Category.values()) {
            if (insert(accountId, category, normalize(email), requestedAt)) {
                seeded.add(category);
            }
        }
        if (!seeded.isEmpty()) {
            requestVerification(require(accountId, seeded.get(0)), seeded);
        }
    }

    /** Creates the categories an account created before contacts existed lacks, without an address. */
    @Transactional(Transactional.TxType.MANDATORY)
    public void ensure(UUID accountId) {
        for (Category category : Category.values()) {
            insert(accountId, category, null, null);
        }
    }

    /**
     * Emails a link that verifies the contact's pending address, requested at its pendingRequestedAt, for
     * {@code categories}; earlier links stop working. The worker makes the link when it sends the email, so
     * the token never rests in the database.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public void requestVerification(AccountContactEntity contact, List<Category> categories) {
        contact.pendingTokenHash = null;
        contact.pendingExpiresAt = null;
        notifications.request(contact.accountId, NotificationKind.CONTACT_VERIFICATION,
                "contact_verification:%s:%d".formatted(contact.id, contact.pendingRequestedAt.toInstant().toEpochMilli()),
                Map.of("contactId", contact.id.toString(),
                        "categories", categories.stream().sorted().map(Category::name).collect(Collectors.joining(",")),
                        "email", contact.pendingEmail,
                        "requestedAt", contact.pendingRequestedAt.toInstant().toString()));
    }

    /**
     * The other categories of the account waiting for the same address since the same request: the ones a
     * single link verifies along with {@code contact}, like the three the owner's address starts with.
     */
    static List<AccountContactEntity> sameRequest(AccountContactEntity contact) {
        if (contact.pendingEmail == null) {
            return List.of();
        }
        return AccountContactEntity.list("accountId = ?1 and id <> ?2 and pendingEmail = ?3 and pendingRequestedAt = ?4",
                contact.accountId, contact.id, contact.pendingEmail, contact.pendingRequestedAt);
    }

    /**
     * At most one verification email to an address a minute per account, so the console cannot be used to
     * flood it. Counted from the emails requested, so canceling a change and asking again does not reset it.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public void checkNotRecentlySent(UUID accountId, String email) {
        Number recent = (Number) em.createNativeQuery("""
                        SELECT count(*) FROM billing.notification_log
                        WHERE account_id = :account AND kind = 'CONTACT_VERIFICATION' AND data ->> 'email' = :email
                          AND created_at > :since
                        """)
                .setParameter("account", accountId)
                .setParameter("email", email)
                .setParameter("since", OffsetDateTime.now().minus(RESEND_AFTER))
                .getSingleResult();
        if (recent.longValue() > 0) {
            throw new DomainException("verification_recently_sent",
                    "A verification email was just sent to that address; wait a minute before asking for another");
        }
    }

    /** Addresses are compared and stored in lower case. */
    static String normalize(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    static AccountContactEntity require(UUID accountId, Category category) {
        return AccountContactEntity.findForUpdate(accountId, category)
                .orElseThrow(() -> new NotFoundException("The account has no " + category + " contact"));
    }

    /** Milliseconds survive the round trip through the database, so the worker can tell one request from another. */
    static OffsetDateTime now() {
        return OffsetDateTime.now().truncatedTo(ChronoUnit.MILLIS);
    }

    private boolean insert(UUID accountId, Category category, String pendingEmail, OffsetDateTime requestedAt) {
        return em.createNativeQuery("""
                        INSERT INTO billing.account_contacts (id, account_id, category, pending_email, pending_requested_at)
                        VALUES (:id, :account, :category, :email, :requestedAt)
                        ON CONFLICT (account_id, category) DO NOTHING
                        """)
                .setParameter("id", Ids.newId())
                .setParameter("account", accountId)
                .setParameter("category", category.name())
                .setParameter("email", pendingEmail)
                .setParameter("requestedAt", requestedAt)
                .executeUpdate() == 1;
    }
}
