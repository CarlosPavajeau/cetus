package com.cantte.cetus.worker.delivery;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity.Status;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity;
import com.cantte.cetus.persistence.entity.WebhookEventEntity;
import com.cantte.cetus.worker.handlers.ProcessWebhookEventHandler;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Resend's delivery events, as the API stores them, move the deliveries of the emails they name. */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
class EmailEventsTest {

    record Bounce(String message, String type) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Data(@JsonProperty("email_id") String emailId, List<String> to, Bounce bounce) {}

    record Event(String type, @JsonProperty("created_at") String createdAt, Data data) {}

    @Inject
    ProcessWebhookEventHandler handler;

    @Inject
    WorkerFixtures fixtures;

    @Inject
    ObjectMapper json;

    @Test
    void aDeliveredEventMarksTheDeliveryAndIsPublished() throws Exception {
        UUID invoice = fixtures.invoice();
        String emailId = "email-" + UUID.randomUUID();
        UUID deliveryId = fixtures.sentDelivery(invoice, emailId);
        fixtures.webhookEndpoint(invoice, environmentOf(invoice), "https://hooks.example.com");

        UUID event = receive("email.delivered", emailId, null);
        process(event);
        process(receive("email.delivered", emailId, null));

        DocumentDeliveryEntity delivery = deliveryOf(deliveryId);
        assertThat(delivery.status).isEqualTo(Status.DELIVERED);
        assertThat(delivery.lastEventAt).isNotNull();
        assertThat(eventOf(event).status).isEqualTo(InboundWebhookEventEntity.Status.PROCESSED);
        assertThat(webhookTypes(invoice)).containsExactly("document.delivered");
    }

    @Test
    void aBounceKeepsItsReasonAndALateDeliveredDoesNotHideIt() throws Exception {
        UUID invoice = fixtures.invoice();
        String emailId = "email-" + UUID.randomUUID();
        UUID deliveryId = fixtures.sentDelivery(invoice, emailId);
        fixtures.webhookEndpoint(invoice, environmentOf(invoice), "https://hooks.example.com");

        process(receive("email.bounced", emailId, new Bounce("Mailbox does not exist", "Permanent")));
        process(receive("email.delivered", emailId, null));

        DocumentDeliveryEntity delivery = deliveryOf(deliveryId);
        assertThat(delivery.status).isEqualTo(Status.BOUNCED);
        assertThat(delivery.error).isEqualTo("Mailbox does not exist");
        assertThat(webhookTypes(invoice)).containsExactly("document.delivery_failed");
    }

    @Test
    void aComplaintIsRecorded() throws Exception {
        String emailId = "email-" + UUID.randomUUID();
        UUID deliveryId = fixtures.sentDelivery(fixtures.invoice(), emailId);

        process(receive("email.complained", emailId, null));

        assertThat(deliveryOf(deliveryId).status).isEqualTo(Status.COMPLAINED);
    }

    @Test
    void anEventOfAnUnknownEmailIsIgnored() throws Exception {
        UUID event = receive("email.delivered", "email-" + UUID.randomUUID(), null);

        process(event);

        assertThat(eventOf(event).status).isEqualTo(InboundWebhookEventEntity.Status.IGNORED);
    }

    /** Stores the event as the API does, with a fresh svix-id. */
    private UUID receive(String type, String emailId, Bounce bounce) throws Exception {
        String payload = json.writeValueAsString(
                new Event(type, "2026-10-19T15:00:00.000Z", new Data(emailId, List.of("cliente@example.com"), bounce)));
        return QuarkusTransaction.requiringNew()
                .call(() -> InboundWebhookEventEntity.record(
                                InboundWebhookEventEntity.Provider.RESEND, "msg_" + UUID.randomUUID(), type, payload)
                        .orElseThrow());
    }

    private void process(UUID eventId) throws Exception {
        handler.handle(fixtures.pendingJob(JobTypes.PROCESS_WEBHOOK_EVENT, eventId));
    }

    private static Environment environmentOf(UUID documentId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(documentId).environment);
    }

    private static DocumentDeliveryEntity deliveryOf(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentDeliveryEntity.findById(id));
    }

    private static InboundWebhookEventEntity eventOf(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> InboundWebhookEventEntity.findById(id));
    }

    private static List<String> webhookTypes(UUID documentId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> WebhookEventEntity.<WebhookEventEntity>list("documentId", documentId).stream()
                        .map(e -> e.type)
                        .toList());
    }
}
