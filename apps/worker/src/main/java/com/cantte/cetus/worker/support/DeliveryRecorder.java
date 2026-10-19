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
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Short transactions that track the delivery of a document to its customer. */
@ApplicationScoped
public class DeliveryRecorder {

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

    /** Nothing to send to: the integrator has to deliver the document by its own means. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void skipped(UUID documentId, String reason) {
        DocumentDeliveryEntity delivery = pendingOrNew(documentId);
        delivery.status = Status.SKIPPED;
        delivery.error = reason;
        publishFailure(delivery);
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void sent(UUID deliveryId, String providerMessageId) {
        DocumentDeliveryEntity delivery = DocumentDeliveryEntity.findById(deliveryId);
        delivery.status = Status.SENT;
        delivery.providerMessageId = providerMessageId;
        delivery.sentAt = OffsetDateTime.now();
        delivery.error = null;
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

    /** Tells the integrator to deliver the document by its own means. */
    private void publishFailure(DocumentDeliveryEntity delivery) {
        webhooks.publish(WebhookEventType.DOCUMENT_DELIVERY_FAILED, DocumentEntity.findById(delivery.documentId),
                new DeliveryInfo(delivery.status.name(), delivery.recipient, delivery.error));
    }

    private static boolean hasResolved(UUID documentId) {
        return DocumentDeliveryEntity.count("documentId = ?1 and status <> ?2", documentId, Status.PENDING) > 0;
    }

    private static DocumentDeliveryEntity pendingOrNew(UUID documentId) {
        return DocumentDeliveryEntity.findPending(documentId).orElseGet(() -> {
            DocumentDeliveryEntity created = new DocumentDeliveryEntity();
            created.id = Ids.newId();
            created.documentId = documentId;
            created.persist();
            return created;
        });
    }
}
