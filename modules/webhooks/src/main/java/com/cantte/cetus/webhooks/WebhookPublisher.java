package com.cantte.cetus.webhooks;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.WebhookDeliveryEntity;
import com.cantte.cetus.persistence.entity.WebhookEndpointEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.hibernate.query.NativeQuery;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Records an event of a document and enqueues one delivery per subscribed endpoint, in the caller's
 * transaction: the event exists if and only if the change it reports was committed.
 */
@ApplicationScoped
public class WebhookPublisher {

    /** What happened to the email delivery a {@code document.*} event reports. */
    public record DeliveryInfo(String status, String recipient, String reason) {
    }

    @Inject
    EntityManager em;
    @Inject
    JobQueue jobs;
    @Inject
    ObjectMapper mapper;

    /** A change of the document's DIAN status. */
    @Transactional(Transactional.TxType.MANDATORY)
    public void publish(WebhookEventType type, DocumentEntity document) {
        publish(type, document, null);
    }

    /**
     * Publishes the event once per document and type: if it was already published (the same fact reported
     * twice), nothing happens.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public void publish(WebhookEventType type, DocumentEntity document, DeliveryInfo delivery) {
        UUID eventId = Ids.newId();
        String payload = payload(eventId, type, document, delivery);
        NativeQuery<?> insert = em.createNativeQuery("""
                        INSERT INTO billing.webhook_events (id, account_id, environment, type, document_id, payload)
                        VALUES (:id, :account, :environment, :type, :document, CAST(:payload AS json))
                        ON CONFLICT (document_id, type) DO NOTHING
                        """)
                .unwrap(NativeQuery.class);
        int inserted = insert.setParameter("id", eventId, UUID.class)
                .setParameter("account", document.accountId, UUID.class)
                .setParameter("environment", document.environment.name(), String.class)
                .setParameter("type", type.wireName(), String.class)
                .setParameter("document", document.id, UUID.class)
                .setParameter("payload", payload, String.class)
                .executeUpdate();
        if (inserted == 0) {
            return;
        }
        for (WebhookEndpointEntity endpoint : WebhookEndpointEntity.listSubscribed(document.accountId,
                document.environment, type.wireName())) {
            WebhookDeliveryEntity created = new WebhookDeliveryEntity();
            created.id = Ids.newId();
            created.eventId = eventId;
            created.endpointId = endpoint.id;
            created.persist();
            jobs.enqueue(JobTypes.DELIVER_WEBHOOK, created.id);
        }
    }

    private String payload(UUID eventId, WebhookEventType type, DocumentEntity document, DeliveryInfo delivery) {
        ObjectNode root = mapper.createObjectNode();
        root.put("id", eventId.toString());
        root.put("type", type.wireName());
        root.put("createdAt", OffsetDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        root.put("environment", document.environment.name());

        ObjectNode data = root.putObject("data");
        data.put("id", document.id.toString());
        data.put("documentType", document.documentType.name());
        data.put("number", document.fullNumber());
        data.put("status", document.status.name());
        data.put("cufe", document.cufe);
        data.put("issueDate", document.issueDate == null ? null : document.issueDate.toString());
        data.put("externalReference", document.externalReference);
        data.put("referencedInvoiceId",
                document.referencedDocumentId == null ? null : document.referencedDocumentId.toString());
        ObjectNode dian = data.putObject("dian");
        dian.put("statusCode", document.dianStatusCode);
        dian.put("statusMessage", document.dianStatusMessage);
        ArrayNode errors = dian.putArray("errors");
        if (document.dianErrors != null) {
            document.dianErrors.forEach(errors::add);
        }
        if (delivery != null) {
            ObjectNode node = data.putObject("delivery");
            node.put("status", delivery.status());
            node.put("recipient", delivery.recipient());
            node.put("reason", delivery.reason());
        }
        try {
            return mapper.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize the webhook event", e);
        }
    }
}
