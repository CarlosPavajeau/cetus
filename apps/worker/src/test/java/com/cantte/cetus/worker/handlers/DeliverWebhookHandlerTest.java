package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.WebhookDeliveryEntity;
import com.cantte.cetus.persistence.entity.WebhookDeliveryEntity.Status;
import com.cantte.cetus.persistence.entity.WebhookEndpointEntity;
import com.cantte.cetus.persistence.entity.WebhookEventEntity;
import com.cantte.cetus.webhooks.WebhookSignature;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.support.FakeDian;
import com.cantte.cetus.worker.support.FakeDian.Reply;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.FakeWebhookReceiver;
import com.cantte.cetus.worker.support.FakeWebhookReceiverResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import com.cantte.cetus.worker.support.WorkerFixtures.Endpoint;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** Delivery of webhook events to a fake integrator endpoint. */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
@QuarkusTestResource(FakeWebhookReceiverResource.class)
class DeliverWebhookHandlerTest {

    @Inject
    ProcessDocumentHandler processor;
    @Inject
    DeliverWebhookHandler handler;
    @Inject
    FakeDian dian;
    @Inject
    FakeWebhookReceiver receiver;
    @Inject
    WorkerFixtures fixtures;
    @Inject
    EntityManager em;

    private Endpoint endpoint;

    @BeforeEach
    void reset() {
        dian.reset();
        receiver.reset();
    }

    @Test
    void sendsTheEventSignedWithTheEndpointSecret() {
        UUID deliveryId = acceptedInvoiceDelivery();
        WebhookEventEntity event = event(deliveryId);

        deliver(deliveryId);

        WebhookDeliveryEntity delivery = delivery(deliveryId);
        assertThat(delivery.status).isEqualTo(Status.SUCCEEDED);
        assertThat(delivery.attempts).isEqualTo(1);
        assertThat(delivery.lastResponseStatus).isEqualTo(200);
        assertThat(delivery.deliveredAt).isNotNull();

        FakeWebhookReceiver.Request request = receiver.requests().get(0);
        assertThat(request.path()).isEqualTo("/hooks/cetus");
        assertThat(request.body()).isEqualTo(event.payload);
        assertThat(request.headers()).containsEntry("content-type", "application/json")
                .containsEntry("user-agent", DeliverWebhookHandler.USER_AGENT)
                .containsEntry("webhook-id", event.id.toString());
        assertThat(WebhookSignature.verify(endpoint.secret(), request.headers().get("webhook-id"),
                request.headers().get("webhook-timestamp"), request.headers().get("webhook-signature"),
                request.body(), Instant.now())).isTrue();
    }

    @Test
    void anErrorIsRetriedWithTheSameIdAndBody() {
        UUID deliveryId = acceptedInvoiceDelivery();
        receiver.reply(new FakeWebhookReceiver.Reply(500, "boom", 0));

        IllegalStateException error = catchThrowableOfType(IllegalStateException.class, () -> deliver(deliveryId));

        assertThat(error).hasMessageContaining("HTTP 500");
        WebhookDeliveryEntity failed = delivery(deliveryId);
        assertThat(failed.status).isEqualTo(Status.PENDING);
        assertThat(failed.lastResponseStatus).isEqualTo(500);
        assertThat(failed.lastResponseBody).isEqualTo("boom");

        deliver(deliveryId);

        WebhookDeliveryEntity delivered = delivery(deliveryId);
        assertThat(delivered.status).isEqualTo(Status.SUCCEEDED);
        assertThat(delivered.attempts).isEqualTo(2);
        assertThat(delivered.lastError).isNull();
        assertThat(receiver.requests()).hasSize(2);
        assertThat(receiver.requests().get(1).headers().get("webhook-id"))
                .isEqualTo(receiver.requests().get(0).headers().get("webhook-id"));
        assertThat(receiver.requests().get(1).body()).isEqualTo(receiver.requests().get(0).body());
    }

    @Test
    void aTimeoutIsRetried() {
        UUID deliveryId = acceptedInvoiceDelivery();
        receiver.reply(FakeWebhookReceiver.Reply.late());

        catchThrowableOfType(IOException.class, () -> handler.handle(job(deliveryId)));

        WebhookDeliveryEntity delivery = delivery(deliveryId);
        assertThat(delivery.status).isEqualTo(Status.PENDING);
        assertThat(delivery.lastError).containsIgnoringCase("timeout");
    }

    @Test
    void goneStopsRetryingAndTheDeliveryFails() {
        UUID deliveryId = acceptedInvoiceDelivery();
        receiver.reply(FakeWebhookReceiver.Reply.status(410));

        JobEntity job = job(deliveryId);
        GiveUp giveUp = catchThrowableOfType(GiveUp.class, () -> handler.handle(job));
        handler.onDead(job, giveUp.getMessage());

        WebhookDeliveryEntity delivery = delivery(deliveryId);
        assertThat(delivery.status).isEqualTo(Status.FAILED);
        assertThat(delivery.lastResponseStatus).isEqualTo(410);
        assertThat(delivery.lastError).contains("Gave up").contains("410");
    }

    @Test
    void aDisabledEndpointCancelsTheDelivery() {
        UUID deliveryId = acceptedInvoiceDelivery();
        QuarkusTransaction.requiringNew().run(() -> {
            WebhookEndpointEntity disabled = WebhookEndpointEntity.findById(endpoint.id());
            disabled.status = WebhookEndpointEntity.Status.DISABLED;
            disabled.disabledAt = OffsetDateTime.now();
        });

        deliver(deliveryId);

        assertThat(delivery(deliveryId).status).isEqualTo(Status.CANCELED);
        assertThat(receiver.requests()).isEmpty();
    }

    @Test
    void aSucceededDeliveryIsNotSentAgain() {
        UUID deliveryId = acceptedInvoiceDelivery();
        deliver(deliveryId);

        deliver(deliveryId);

        assertThat(receiver.requests()).hasSize(1);
    }

    @Test
    void deadDeliveriesFailButSucceededOnesKeepTheirStatus() {
        UUID deliveryId = acceptedInvoiceDelivery();
        deliver(deliveryId);

        handler.onDead(job(deliveryId), "late duplicate");

        assertThat(delivery(deliveryId).status).isEqualTo(Status.SUCCEEDED);
    }

    @Test
    void anEndpointFailingForDaysIsDisabledAutomatically() {
        UUID deliveryId = acceptedInvoiceDelivery();
        failingSince(OffsetDateTime.now().minusDays(4), 9);
        receiver.reply(FakeWebhookReceiver.Reply.status(503));

        catchThrowableOfType(IllegalStateException.class, () -> deliver(deliveryId));

        WebhookEndpointEntity disabled = endpoint();
        assertThat(disabled.status).isEqualTo(WebhookEndpointEntity.Status.DISABLED);
        assertThat(disabled.disabledReason).isEqualTo(WebhookEndpointEntity.DisabledReason.AUTOMATIC);
        assertThat(disabled.consecutiveFailures).isEqualTo(10);
        assertThat(auditedReasons(disabled)).containsExactly("AUTOMATIC");

        // Its next attempt finds it disabled and stops instead of calling it again.
        deliver(deliveryId);
        assertThat(delivery(deliveryId).status).isEqualTo(Status.CANCELED);
        assertThat(receiver.requests()).hasSize(1);
    }

    @Test
    void manyRecentFailuresAreNotEnoughToDisable() {
        UUID deliveryId = acceptedInvoiceDelivery();
        failingSince(OffsetDateTime.now().minusHours(1), 50);
        receiver.reply(FakeWebhookReceiver.Reply.status(500));

        catchThrowableOfType(IllegalStateException.class, () -> deliver(deliveryId));

        WebhookEndpointEntity endpoint = endpoint();
        assertThat(endpoint.status).isEqualTo(WebhookEndpointEntity.Status.ACTIVE);
        assertThat(endpoint.consecutiveFailures).isEqualTo(51);
    }

    @Test
    void aSuccessEndsTheStreakOfFailures() {
        UUID deliveryId = acceptedInvoiceDelivery();
        receiver.reply(FakeWebhookReceiver.Reply.status(500));
        catchThrowableOfType(IllegalStateException.class, () -> deliver(deliveryId));
        assertThat(endpoint().consecutiveFailures).isEqualTo(1);
        assertThat(endpoint().failingSince).isNotNull();

        deliver(deliveryId);

        assertThat(endpoint().consecutiveFailures).isZero();
        assertThat(endpoint().failingSince).isNull();
    }

    private void failingSince(OffsetDateTime since, int failures) {
        QuarkusTransaction.requiringNew().run(() -> {
            WebhookEndpointEntity failing = WebhookEndpointEntity.findById(endpoint.id());
            failing.failingSince = since;
            failing.consecutiveFailures = failures;
        });
    }

    private WebhookEndpointEntity endpoint() {
        return QuarkusTransaction.requiringNew().call(() -> WebhookEndpointEntity.findById(endpoint.id()));
    }

    @SuppressWarnings("unchecked")
    private List<String> auditedReasons(WebhookEndpointEntity endpoint) {
        return QuarkusTransaction.requiringNew().call(() -> em.createNativeQuery("""
                        SELECT data->>'reason' FROM billing.audit_log
                        WHERE resource_id = :id AND action = 'WEBHOOK_ENDPOINT_DISABLED' AND actor_type = 'SYSTEM'""")
                .setParameter("id", endpoint.id).getResultList());
    }

    /** An accepted invoice with one endpoint on the fake receiver; returns its pending delivery. */
    private UUID acceptedInvoiceDelivery() {
        dian.reply("SendBillSync", Reply.fixture("send-bill-sync-accepted.xml"));
        UUID id = fixtures.invoice();
        endpoint = fixtures.webhookEndpoint(id, Environment.TEST, receiver.url("/hooks/cetus"));
        processor.handle(fixtures.job(id, 1));
        return QuarkusTransaction.requiringNew().call(() ->
                WebhookDeliveryEntity.<WebhookDeliveryEntity>find("endpointId", endpoint.id()).singleResult().id);
    }

    private JobEntity job(UUID deliveryId) {
        return fixtures.job(deliveryId, 1);
    }

    private void deliver(UUID deliveryId) {
        try {
            handler.handle(job(deliveryId));
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static WebhookDeliveryEntity delivery(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> WebhookDeliveryEntity.findById(id));
    }

    private static WebhookEventEntity event(UUID deliveryId) {
        return QuarkusTransaction.requiringNew().call(() ->
                WebhookEventEntity.findById(WebhookDeliveryEntity.<WebhookDeliveryEntity>findById(deliveryId).eventId));
    }
}
