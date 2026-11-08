package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.notifications.Notifications;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.persistence.entity.WebhookDeliveryEntity;
import com.cantte.cetus.persistence.entity.WebhookEndpointEntity;
import com.cantte.cetus.webhooks.WebhookEventType;
import com.cantte.cetus.webhooks.WebhookPublisher;
import com.cantte.cetus.webhooks.WebhookPublisher.DeliveryInfo;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;

/** The recorders move a delivery or a notice only from the status a transition starts at. */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
class RecorderGuardsTest {

    @Inject
    DeliveryRecorder deliveries;

    @Inject
    NotificationRecorder notices;

    @Inject
    WebhookDeliveryRecorder webhookDeliveries;

    @Inject
    Notifications notifications;

    @Inject
    WebhookPublisher webhooks;

    @Inject
    WorkerFixtures fixtures;

    @Test
    void twoRunsAtOnceShareTheDocumentsPendingDelivery() {
        UUID documentId = fixtures.invoice();

        List<UUID> attempts = List.of(
                        CompletableFuture.supplyAsync(() -> deliveries.attempt(documentId, "cliente@example.com")),
                        CompletableFuture.supplyAsync(() -> deliveries.attempt(documentId, "cliente@example.com")))
                .stream()
                .map(CompletableFuture::join)
                .toList();

        assertThat(attempts).containsOnly(attempts.getFirst());
        DocumentDeliveryEntity delivery = documentDelivery(attempts.getFirst());
        assertThat(delivery.attempts).isEqualTo(2);
        assertThat(QuarkusTransaction.requiringNew().call(() -> DocumentDeliveryEntity.count("documentId", documentId)))
                .isEqualTo(1);
    }

    @Test
    void aDeliveryAlreadyResolvedIsNotMarkedSent() {
        UUID documentId = fixtures.invoice();
        UUID deliveryId = deliveries.attempt(documentId, "cliente@example.com");
        deliveries.deliveryFailed(deliveryId, "Gave up");

        boolean moved = deliveries.sent(deliveryId, "email-" + UUID.randomUUID());

        assertThat(moved).isFalse();
        DocumentDeliveryEntity delivery = documentDelivery(deliveryId);
        assertThat(delivery.status).isEqualTo(DocumentDeliveryEntity.Status.FAILED);
        assertThat(delivery.providerMessageId).isNull();
    }

    @Test
    void aNoticeAlreadyResolvedIsNotMarkedSent() {
        UUID accountId = accountOf(fixtures.invoice());
        UUID id = QuarkusTransaction.requiringNew()
                .call(() -> notifications
                        .request(
                                accountId,
                                NotificationKind.REJECTIONS_SPIKE,
                                "rejections_spike:" + UUID.randomUUID(),
                                Map.of("date", "22/10/2026", "rejected", "5", "total", "8", "rate", "63"))
                        .orElseThrow());
        notices.skipped(id, "Nobody to tell");

        boolean moved = notices.sent(id, List.of("tecnico@example.com"));

        assertThat(moved).isFalse();
        NotificationEntity notice = QuarkusTransaction.requiringNew().call(() -> NotificationEntity.findById(id));
        assertThat(notice.status).isEqualTo(NotificationEntity.Status.SKIPPED);
        assertThat(notice.sentAt).isNull();
    }

    @Test
    void anAnswerToACanceledWebhookDeliveryChangesNothing() {
        UUID deliveryId = webhookDelivery();
        UUID endpointId = webhookDelivery(deliveryId).endpointId;
        failing(endpointId, WebhookEndpointEntity.Status.DISABLED);
        assertThat(webhookDeliveries.canceled(deliveryId)).isTrue();

        boolean moved = webhookDeliveries.succeeded(deliveryId, 200, "ok");

        assertThat(moved).isFalse();
        assertThat(webhookDelivery(deliveryId).status).isEqualTo(WebhookDeliveryEntity.Status.CANCELED);
        assertThat(endpoint(endpointId).consecutiveFailures).isEqualTo(3);
    }

    @Test
    void aDisabledEndpointKeepsItsStreakWhenALateDeliverySucceeds() {
        UUID deliveryId = webhookDelivery();
        UUID endpointId = webhookDelivery(deliveryId).endpointId;
        failing(endpointId, WebhookEndpointEntity.Status.DISABLED);

        boolean moved = webhookDeliveries.succeeded(deliveryId, 200, "ok");

        assertThat(moved).isTrue();
        assertThat(webhookDelivery(deliveryId).status).isEqualTo(WebhookDeliveryEntity.Status.SUCCEEDED);
        assertThat(endpoint(endpointId).consecutiveFailures).isEqualTo(3);
    }

    @Test
    void aSuccessClearsTheStreakOfAnActiveEndpoint() {
        UUID deliveryId = webhookDelivery();
        UUID endpointId = webhookDelivery(deliveryId).endpointId;
        failing(endpointId, WebhookEndpointEntity.Status.ACTIVE);

        webhookDeliveries.succeeded(deliveryId, 200, "ok");

        WebhookEndpointEntity endpoint = endpoint(endpointId);
        assertThat(endpoint.consecutiveFailures).isZero();
        assertThat(endpoint.failingSince).isNull();
    }

    /** A pending delivery of an event of a new invoice to an endpoint subscribed to every event. */
    private UUID webhookDelivery() {
        UUID documentId = fixtures.invoice();
        Environment environment = QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(documentId).environment);
        UUID endpointId = fixtures.webhookEndpoint(documentId, environment, "https://hooks.example.com")
                .id();
        QuarkusTransaction.requiringNew()
                .run(() -> webhooks.publish(
                        WebhookEventType.DOCUMENT_DELIVERY_FAILED,
                        DocumentEntity.findById(documentId),
                        new DeliveryInfo("FAILED", "cliente@example.com", "Mailbox full")));
        return QuarkusTransaction.requiringNew()
                .call(() -> WebhookDeliveryEntity.<WebhookDeliveryEntity>find("endpointId", endpointId)
                        .singleResult()
                        .id);
    }

    private static void failing(UUID endpointId, WebhookEndpointEntity.Status status) {
        QuarkusTransaction.requiringNew()
                .run(() -> WebhookEndpointEntity.update(
                        "status = ?1, consecutiveFailures = 3, failingSince = ?2 where id = ?3",
                        status,
                        OffsetDateTime.now().minusDays(1),
                        endpointId));
    }

    private static UUID accountOf(UUID documentId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(documentId).accountId);
    }

    private static DocumentDeliveryEntity documentDelivery(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentDeliveryEntity.findById(id));
    }

    private static WebhookDeliveryEntity webhookDelivery(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> WebhookDeliveryEntity.findById(id));
    }

    private static WebhookEndpointEntity endpoint(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> WebhookEndpointEntity.findById(id));
    }
}
