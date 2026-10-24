package com.cantte.cetus.api.console;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Queues another email of an accepted document, once its first delivery is over. The worker picks the
 * recipient: the address asked for, or whom the first delivery would go to; a SANDBOX document only ever
 * reaches the technical contact, so it takes no address.
 */
@ApplicationScoped
public class DocumentResends {

    static final Duration INTERVAL = Duration.ofMinutes(1);

    @Inject
    JobQueue jobs;

    @Transactional(Transactional.TxType.MANDATORY)
    public DocumentDeliveryEntity resend(UUID accountId, UUID documentId, Environment environment, String email) {
        // Locked, so two clicks at once cannot both pass the checks below.
        DocumentEntity doc = DocumentEntity.lockForAccount(accountId, documentId, environment)
                .orElseThrow(() -> new NotFoundException("Document not found"));
        if (doc.status != DocumentStatus.ACCEPTED) {
            throw new DomainException(
                    "document_not_accepted",
                    "Only documents accepted by the DIAN can be emailed; this one is " + doc.status);
        }
        if (environment == Environment.SANDBOX && email != null) {
            throw new DomainException(
                    "sandbox_recipient", "SANDBOX documents only go to the account's technical contact");
        }
        if (environment == Environment.LIVE
                && email == null
                && (doc.customer.email() == null || doc.customer.email().isBlank())) {
            throw new DomainException("recipient_required", "The customer has no email address; send one");
        }
        List<DocumentDeliveryEntity> previous = DocumentDeliveryEntity.listByDocument(doc.id);
        if (previous.isEmpty() || previous.stream().anyMatch(d -> d.status == DocumentDeliveryEntity.Status.PENDING)) {
            throw new DomainException("delivery_in_progress", "The document is still being emailed");
        }
        OffsetDateTime last = previous.getLast().createdAt;
        Duration wait = Duration.between(OffsetDateTime.now(), last.plus(INTERVAL));
        if (!wait.isNegative() && !wait.isZero()) {
            throw new TooSoon(wait);
        }

        DocumentDeliveryEntity delivery = new DocumentDeliveryEntity();
        delivery.id = Ids.newId();
        delivery.documentId = doc.id;
        delivery.recipient = email;
        delivery.persist();
        jobs.enqueue(JobTypes.RESEND_DOCUMENT, delivery.id);
        return delivery;
    }

    /** 429 until a minute has passed since the document's last delivery. */
    public static class TooSoon extends WebApplicationException {

        TooSoon(Duration wait) {
            super(ProblemDetail.builder(429, "delivery_too_soon", "The document was emailed less than a minute ago")
                    .header("Retry-After", Math.max(1, wait.toSeconds()))
                    .build());
        }
    }
}
