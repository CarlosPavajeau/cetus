package com.cantte.cetus.api.console;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.IssuedDocuments;
import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.WebhookEndpointEntity;
import com.cantte.cetus.webhooks.WebhookEventType;
import com.cantte.cetus.webhooks.WebhookPublisher;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class WebhookEndpointResourceTest {

    @Inject
    WebhookPublisher publisher;
    @Inject
    SecretCipher cipher;

    @Test
    void createReturnsTheSecretOnceAndStoresItSealed() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Hooks SAS");

        JsonPath created = create(user, Map.of("url", "https://hooks.example.com/cetus", "environment", "LIVE",
                "description", "ERP", "eventTypes", List.of("invoice.accepted", "invoice.accepted", "document.delivered")));

        String id = created.getString("endpoint.id");
        String secret = created.getString("secret");
        assertThat(secret).startsWith("whsec_");
        assertThat(created.getList("endpoint.eventTypes")).containsExactly("invoice.accepted", "document.delivered");
        assertThat(created.getString("endpoint.status")).isEqualTo("ACTIVE");
        assertThat(created.getString("endpoint.createdAt")).isNotNull();
        assertThat(created.getString("endpoint.createdBy")).isEqualTo(user.userId());
        assertThat(QuarkusTransaction.requiringNew().call(() ->
                cipher.openText(WebhookEndpointEntity.<WebhookEndpointEntity>findById(UUID.fromString(id)).secretSealed)))
                .isEqualTo(secret);

        String listed = user.request().get("/console/webhook-endpoints").then().statusCode(200).extract().asString();
        assertThat(listed).contains(id).doesNotContain(secret);
        user.request().get("/console/webhook-endpoints/" + id).then().statusCode(200)
                .body("url", equalTo("https://hooks.example.com/cetus"))
                .body("$", not(hasKey("secret")));
    }

    @Test
    void liveEndpointsMustUseHttpsAndEventTypesMustExist() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Strict SAS");

        user.request().body(Map.of("url", "http://hooks.example.com", "environment", "LIVE"))
                .post("/console/webhook-endpoints").then().statusCode(422).body("code", equalTo("invalid_webhook_url"));
        user.request().body(Map.of("url", "https://hooks.example.com", "environment", "TEST", "eventTypes", List.of("invoice.paid")))
                .post("/console/webhook-endpoints").then().statusCode(422).body("code", equalTo("unknown_event_type"));
        user.request().body(Map.of("environment", "TEST"))
                .post("/console/webhook-endpoints").then().statusCode(400);
    }

    @Test
    void listsTheEventTypes() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Types SAS");

        user.request().get("/console/webhook-endpoints/event-types").then().statusCode(200)
                .body("$", hasItems("invoice.accepted", "credit_note.failed", "document.delivery_failed"));
    }

    @Test
    void anotherAccountsEndpointIsNotFound() {
        ConsoleUser alice = ConsoleUser.newOrganization();
        ConsoleUser bob = ConsoleUser.newOrganization();
        bootstrap(alice, "Alice SAS");
        bootstrap(bob, "Bob SAS");
        String bobs = create(bob, Map.of("url", "https://bob.example.com", "environment", "TEST")).getString("endpoint.id");

        alice.request().get("/console/webhook-endpoints/" + bobs).then().statusCode(404);
        alice.request().delete("/console/webhook-endpoints/" + bobs).then().statusCode(404);
        alice.request().get("/console/webhook-endpoints/" + bobs + "/deliveries").then().statusCode(404);
    }

    @Test
    void disablingIsIdempotentAndStopsRetries() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Disable SAS");
        String id = create(user, Map.of("url", "https://hooks.example.com", "environment", "TEST")).getString("endpoint.id");

        user.request().delete("/console/webhook-endpoints/" + id).then().statusCode(204);
        user.request().delete("/console/webhook-endpoints/" + id).then().statusCode(204);

        user.request().get("/console/webhook-endpoints/" + id).then().statusCode(200)
                .body("status", equalTo("DISABLED"))
                .body("disabledReason", equalTo("MANUAL"));
        user.request().post("/console/webhook-endpoints/" + id + "/deliveries/" + UUID.randomUUID() + "/retry")
                .then().statusCode(422).body("code", equalTo("endpoint_disabled"));
    }

    @Test
    void enablingStartsTheFailureCountOver() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Enable SAS");
        String id = create(user, Map.of("url", "https://hooks.example.com", "environment", "TEST")).getString("endpoint.id");
        QuarkusTransaction.requiringNew().run(() -> {
            WebhookEndpointEntity endpoint = WebhookEndpointEntity.findById(UUID.fromString(id));
            endpoint.status = WebhookEndpointEntity.Status.DISABLED;
            endpoint.disabledReason = WebhookEndpointEntity.DisabledReason.AUTOMATIC;
            endpoint.disabledAt = OffsetDateTime.now();
            endpoint.consecutiveFailures = 12;
            endpoint.failingSince = OffsetDateTime.now().minusDays(4);
        });
        user.request().get("/console/webhook-endpoints/" + id).then().statusCode(200)
                .body("disabledReason", equalTo("AUTOMATIC"))
                .body("consecutiveFailures", equalTo(12));

        user.request().post("/console/webhook-endpoints/" + id + "/enable").then().statusCode(200)
                .body("status", equalTo("ACTIVE"))
                .body("disabledReason", nullValue())
                .body("consecutiveFailures", equalTo(0))
                .body("failingSince", nullValue());
        user.request().post("/console/webhook-endpoints/" + id + "/enable").then().statusCode(200);
    }

    @Test
    void deliveriesArePagedNewestFirstAndCanBeSentAgain() {
        ConsoleUser user = ConsoleUser.newOrganization();
        IssuedDocuments.Issuer issuer = IssuedDocuments.issuer(user, "History SAS");
        String id = create(user, Map.of("url", "https://hooks.example.com", "environment", "TEST")).getString("endpoint.id");
        UUID invoice = IssuedDocuments.invoice(issuer);
        for (WebhookEventType type : List.of(WebhookEventType.INVOICE_FAILED, WebhookEventType.INVOICE_ACCEPTED,
                WebhookEventType.DOCUMENT_DELIVERED)) {
            QuarkusTransaction.requiringNew().run(() -> publisher.publish(type, DocumentEntity.findById(invoice)));
        }

        JsonPath first = user.request().queryParam("limit", 2).get("/console/webhook-endpoints/" + id + "/deliveries")
                .then().statusCode(200).extract().jsonPath();
        assertThat(first.getList("items")).hasSize(2);
        assertThat(first.getString("items[0].documentId")).isEqualTo(invoice.toString());
        assertThat(first.getString("items[0].status")).isEqualTo("PENDING");
        String cursor = first.getString("nextCursor");
        assertThat(cursor).isNotNull();
        JsonPath second = user.request().queryParam("limit", 2).queryParam("before", cursor)
                .get("/console/webhook-endpoints/" + id + "/deliveries")
                .then().statusCode(200).body("nextCursor", nullValue()).extract().jsonPath();
        // UUID v7 ids only order by millisecond, so the order within a page is not asserted: no gaps, no repeats.
        List<String> types = new ArrayList<>(first.getList("items.eventType"));
        types.addAll(second.getList("items.eventType"));
        assertThat(types).containsExactlyInAnyOrder("invoice.failed", "invoice.accepted", "document.delivered");

        String deliveryId = second.getString("items[0].id");
        String retry = "/console/webhook-endpoints/" + id + "/deliveries/" + deliveryId + "/retry";
        user.request().post(retry).then().statusCode(422).body("code", equalTo("delivery_in_progress"));

        QuarkusTransaction.requiringNew().run(() ->
                JobEntity.update("status = 'DONE' where jobType = ?1 and referenceId = ?2",
                        JobTypes.DELIVER_WEBHOOK, UUID.fromString(deliveryId)));
        user.request().post(retry).then().statusCode(200).body("status", equalTo("PENDING"));
        assertThat(QuarkusTransaction.requiringNew().call(() -> JobEntity.count(
                "jobType = ?1 and referenceId = ?2 and status = 'PENDING'", JobTypes.DELIVER_WEBHOOK, UUID.fromString(deliveryId))))
                .isEqualTo(1);
    }

    private static JsonPath create(ConsoleUser user, Map<String, Object> body) {
        return user.request().body(body).post("/console/webhook-endpoints")
                .then().statusCode(200).extract().jsonPath();
    }
}
