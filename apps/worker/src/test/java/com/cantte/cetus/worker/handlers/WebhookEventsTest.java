package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.WebhookDeliveryEntity;
import com.cantte.cetus.persistence.entity.WebhookEndpointEntity;
import com.cantte.cetus.persistence.entity.WebhookEventEntity;
import com.cantte.cetus.worker.support.DeliveryRecorder;
import com.cantte.cetus.worker.support.FakeDian;
import com.cantte.cetus.worker.support.FakeDian.Reply;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import com.cantte.cetus.worker.support.WorkerFixtures.Endpoint;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** Which webhook events the worker publishes, and to which endpoints. */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
class WebhookEventsTest {

    private static final String SEND = "SendBillSync";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Inject
    ProcessDocumentHandler processor;
    @Inject
    DeliveryRecorder deliveryRecorder;
    @Inject
    FakeDian dian;
    @Inject
    WorkerFixtures fixtures;

    @BeforeEach
    void reset() {
        dian.reset();
    }

    @Test
    void anAcceptedInvoiceIsSentToEverySubscribedEndpointOfItsEnvironment() throws Exception {
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted.xml"));
        UUID id = fixtures.invoice();
        Endpoint all = fixtures.webhookEndpoint(id, Environment.TEST, "https://hooks.example.com/all");
        Endpoint accepted = fixtures.webhookEndpoint(id, Environment.TEST, "https://hooks.example.com/accepted", "invoice.accepted");
        fixtures.webhookEndpoint(id, Environment.TEST, "https://hooks.example.com/notes", "credit_note.accepted");
        fixtures.webhookEndpoint(id, Environment.LIVE, "https://hooks.example.com/live");
        Endpoint disabled = fixtures.webhookEndpoint(id, Environment.TEST, "https://hooks.example.com/off");
        QuarkusTransaction.requiringNew().run(() -> {
            WebhookEndpointEntity endpoint = WebhookEndpointEntity.findById(disabled.id());
            endpoint.status = WebhookEndpointEntity.Status.DISABLED;
            endpoint.disabledAt = OffsetDateTime.now();
        });

        processor.handle(fixtures.job(id, 1));

        WebhookEventEntity event = singleEvent(id);
        assertThat(event.type).isEqualTo("invoice.accepted");
        List<WebhookDeliveryEntity> deliveries = deliveries(event.id);
        assertThat(deliveries).extracting(d -> d.endpointId).containsExactlyInAnyOrder(all.id(), accepted.id());
        assertThat(deliveries).allSatisfy(d -> assertThat(d.status).isEqualTo(WebhookDeliveryEntity.Status.PENDING));
        assertThat(webhookJobs()).containsAll(deliveries.stream().map(d -> d.id).toList());

        DocumentEntity doc = document(id);
        JsonNode payload = JSON.readTree(event.payload);
        assertThat(payload.get("id").asText()).isEqualTo(event.id.toString());
        assertThat(payload.get("type").asText()).isEqualTo("invoice.accepted");
        assertThat(payload.get("environment").asText()).isEqualTo("TEST");
        JsonNode data = payload.get("data");
        assertThat(data.get("id").asText()).isEqualTo(id.toString());
        assertThat(data.get("documentType").asText()).isEqualTo("INVOICE");
        assertThat(data.get("number").asText()).isEqualTo(doc.fullNumber());
        assertThat(data.get("status").asText()).isEqualTo("ACCEPTED");
        assertThat(data.get("cufe").asText()).isEqualTo(doc.cufe);
        assertThat(data.get("dian").get("statusCode").asText()).isEqualTo(doc.dianStatusCode);
        assertThat(data.has("delivery")).isFalse();
    }

    @Test
    void aRejectionIsPublished() {
        dian.reply(SEND, Reply.fixture("send-bill-sync-rejected.xml"));
        UUID id = fixtures.invoice();

        processor.handle(fixtures.job(id, 1));

        assertThat(singleEvent(id).type).isEqualTo("invoice.rejected");
    }

    @Test
    void aRetryableFailureIsNotPublishedUntilTheWorkerGivesUp() {
        dian.reply(SEND, Reply.fault("fault-server.xml"));
        dian.reply("GetStatus", Reply.fixture("get-status-not-found.xml"));
        UUID id = fixtures.invoice();

        catchThrowableOfType(DianFaultException.class, () -> processor.handle(fixtures.job(id, 1)));
        assertThat(events(id)).isEmpty();

        JobEntity job = fixtures.job(id, 10);
        processor.onDead(job, "DIAN fault");
        processor.onDead(job, "DIAN fault");

        assertThat(singleEvent(id).type).isEqualTo("invoice.failed");
    }

    @Test
    void aCreditNoteNamesTheInvoiceItCorrects() throws Exception {
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted.xml"));
        UUID invoiceId = fixtures.invoice();
        UUID id = fixtures.creditNote(invoiceId);

        processor.handle(fixtures.job(id, 1));

        WebhookEventEntity event = singleEvent(id);
        assertThat(event.type).isEqualTo("credit_note.accepted");
        assertThat(JSON.readTree(event.payload).get("data").get("referencedInvoiceId").asText())
                .isEqualTo(invoiceId.toString());
    }

    @Test
    void aSkippedEmailTellsTheIntegratorToDeliverItself() throws Exception {
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted.xml"));
        UUID id = fixtures.invoice();
        processor.handle(fixtures.job(id, 1));

        deliveryRecorder.skipped(id, "The customer has no email address");

        WebhookEventEntity event = QuarkusTransaction.requiringNew().call(() ->
                WebhookEventEntity.<WebhookEventEntity>find("documentId = ?1 and type = ?2", id, "document.delivery_failed")
                        .singleResult());
        JsonNode delivery = JSON.readTree(event.payload).get("data").get("delivery");
        assertThat(delivery.get("status").asText()).isEqualTo("SKIPPED");
        assertThat(delivery.get("reason").asText()).isEqualTo("The customer has no email address");
    }

    private static DocumentEntity document(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentEntity.findById(id));
    }

    private static List<WebhookEventEntity> events(UUID documentId) {
        return QuarkusTransaction.requiringNew().call(() -> WebhookEventEntity.list("documentId", documentId));
    }

    private static WebhookEventEntity singleEvent(UUID documentId) {
        List<WebhookEventEntity> events = events(documentId);
        assertThat(events).hasSize(1);
        return events.get(0);
    }

    private static List<WebhookDeliveryEntity> deliveries(UUID eventId) {
        return QuarkusTransaction.requiringNew().call(() -> WebhookDeliveryEntity.listByEvent(eventId));
    }

    private static List<UUID> webhookJobs() {
        return QuarkusTransaction.requiringNew().call(() ->
                JobEntity.<JobEntity>list("jobType", JobTypes.DELIVER_WEBHOOK).stream().map(job -> job.referenceId).toList());
    }
}
