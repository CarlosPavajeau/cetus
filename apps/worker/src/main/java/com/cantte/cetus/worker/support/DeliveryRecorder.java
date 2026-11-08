package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity.Status;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.webhooks.WebhookEventType;
import com.cantte.cetus.webhooks.WebhookPublisher;
import com.cantte.cetus.webhooks.WebhookPublisher.DeliveryInfo;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.jboss.logging.Logger;

/** Short transactions that track the delivery of a document to its customer. */
@ApplicationScoped
public class DeliveryRecorder {

    private static final Logger LOG = Logger.getLogger(DeliveryRecorder.class);

    @Inject
    WebhookPublisher webhooks;

    /** Whether the document already has a delivery that is not pending: sent, skipped or failed. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public boolean resolved(UUID documentId) {
        return hasResolved(documentId);
    }

    /**
     * The pending delivery of the document, created on the first attempt. Every retry reuses it, and with it
     * the idempotency key derived from its id, so the provider never sends the email twice.
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public UUID attempt(UUID documentId, String recipient) {
        DocumentDeliveryEntity delivery = pendingOrNew(documentId);
        delivery.recipient = recipient;
        delivery.attempts++;
        return delivery.id;
    }

    /** A delivery the console asked for again: every attempt of its job reuses the row and its key. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void resendAttempt(UUID deliveryId, String recipient) {
        DocumentDeliveryEntity delivery = DocumentDeliveryEntity.findById(deliveryId);
        delivery.recipient = recipient;
        delivery.attempts++;
    }

    /** Nothing to send to: the integrator has to deliver the document by its own means. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void skipped(UUID documentId, String reason) {
        DocumentDeliveryEntity delivery = pendingOrNew(documentId);
        delivery.status = Status.SKIPPED;
        delivery.error = reason;
        publishFailure(delivery);
    }

    /**
     * Records that the provider took the email. Only a pending delivery moves: one another run already resolved
     * keeps its status, and the provider's events find it by the message id all the same.
     *
     * @return whether the delivery moved to SENT
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public boolean sent(UUID deliveryId, String providerMessageId) {
        OffsetDateTime now = OffsetDateTime.now();
        boolean moved = DocumentDeliveryEntity.update(
                        "status = ?1, providerMessageId = ?2, sentAt = ?3, updatedAt = ?3, error = null"
                                + " where id = ?4 and status = ?5",
                        Status.SENT,
                        providerMessageId,
                        now,
                        deliveryId,
                        Status.PENDING)
                > 0;
        if (!moved) {
            LOG.warnf("Delivery %s was already resolved when its email %s went out", deliveryId, providerMessageId);
        }
        return moved;
    }

    /** Records the error of a failed attempt; the delivery stays pending for the next one. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void attemptFailed(UUID deliveryId, String error) {
        DocumentDeliveryEntity delivery = DocumentDeliveryEntity.findById(deliveryId);
        delivery.error = error;
    }

    /**
     * Gives up on delivering the document. Records the failure even when it happened before any attempt
     * (e.g. no ApplicationResponse to build the container), unless the delivery was already resolved.
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void failed(UUID documentId, String error) {
        if (DocumentDeliveryEntity.findPending(documentId).isEmpty() && hasResolved(documentId)) {
            return;
        }
        DocumentDeliveryEntity delivery = pendingOrNew(documentId);
        delivery.status = Status.FAILED;
        delivery.error = error;
        publishFailure(delivery);
    }

    /** Like {@link #failed(UUID, String)}, for a delivery already under way; a resolved one is left as is. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void deliveryFailed(UUID deliveryId, String error) {
        resolve(deliveryId, Status.FAILED, error);
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void deliverySkipped(UUID deliveryId, String reason) {
        resolve(deliveryId, Status.SKIPPED, reason);
    }

    /** Locked, so a run marking it sent at the same time is not overwritten. */
    private void resolve(UUID deliveryId, Status status, String error) {
        DocumentDeliveryEntity delivery = DocumentDeliveryEntity.findById(deliveryId, LockModeType.PESSIMISTIC_WRITE);
        if (delivery.status != Status.PENDING) {
            return;
        }
        delivery.status = status;
        delivery.error = error;
        publishFailure(delivery);
    }

    /** Tells the integrator to deliver the document by its own means. */
    private void publishFailure(DocumentDeliveryEntity delivery) {
        webhooks.publish(
                WebhookEventType.DOCUMENT_DELIVERY_FAILED,
                DocumentEntity.findById(delivery.documentId),
                new DeliveryInfo(delivery.status.name(), delivery.recipient, delivery.error));
    }

    private static boolean hasResolved(UUID documentId) {
        return DocumentDeliveryEntity.count("documentId = ?1 and status <> ?2", documentId, Status.PENDING) > 0;
    }

    /** Two runs at once end up on the same row: the index allows one pending delivery per document. */
    private static DocumentDeliveryEntity pendingOrNew(UUID documentId) {
        DocumentDeliveryEntity.getEntityManager()
                .createNativeQuery("""
                        INSERT INTO billing.document_deliveries (id, document_id) VALUES (:id, :document)
                        ON CONFLICT (document_id) WHERE status = 'PENDING' DO NOTHING
                        """)
                .setParameter("id", Ids.newId())
                .setParameter("document", documentId)
                .executeUpdate();
        return DocumentDeliveryEntity.lockPending(documentId).orElseThrow();
    }
}
