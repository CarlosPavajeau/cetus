package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.persistence.entity.AccountContactEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Where a SANDBOX document is emailed: never to its customer, whose data may well be real, but to the
 * account's technical contact, so the integrator sees the email the customer would get. A few a day per
 * account are enough to see it; past {@code cetus.sandbox.daily-emails} the delivery is skipped.
 */
@ApplicationScoped
public class SandboxDeliveries {

    @Inject
    EntityManager em;

    @ConfigProperty(name = "cetus.sandbox.daily-emails")
    int dailyEmails;

    /** Either the address to send to or why nothing is sent. */
    public record Recipient(String email, String skipReason) {
    }

    public Recipient recipient(UUID documentId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            UUID accountId = DocumentEntity.<DocumentEntity>findById(documentId).accountId;
            List<String> technical = AccountContactEntity.emails(accountId, List.of(AccountContactEntity.Category.TECHNICAL));
            if (technical.isEmpty()) {
                return new Recipient(null, "SANDBOX documents go to the account's technical contact, which has no verified address");
            }
            if (sentToday(accountId, documentId) >= dailyEmails) {
                return new Recipient(null, "The account already received its " + dailyEmails
                        + " SANDBOX emails of the day");
            }
            return new Recipient(technical.getFirst(), null);
        });
    }

    /**
     * SANDBOX deliveries handed to the email provider since midnight in Colombia, other than this document's:
     * a retry after a provider rate limit keeps the slot its first attempt took.
     */
    private long sentToday(UUID accountId, UUID documentId) {
        OffsetDateTime midnight = LocalDate.now(DianTime.ZONE).atStartOfDay(DianTime.ZONE).toOffsetDateTime();
        return ((Number) em.createNativeQuery("""
                        SELECT count(*) FROM billing.document_deliveries x
                        JOIN billing.documents d ON d.id = x.document_id
                        WHERE d.account_id = :account AND d.environment = 'SANDBOX'
                          AND x.status NOT IN ('SKIPPED', 'FAILED') AND x.created_at >= :midnight
                          AND x.document_id <> :document
                        """)
                .setParameter("account", accountId)
                .setParameter("document", documentId)
                .setParameter("midnight", midnight)
                .getSingleResult()).longValue();
    }
}
