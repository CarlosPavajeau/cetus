package com.cantte.cetus.api.billing;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;

/** Wompi's events: stored once each, by checksum, when signed for this environment, and handed to the worker. */
@QuarkusTest
class WompiEventResourceTest {

    /** The events secret of the test profile. */
    private static final String EVENTS_SECRET = "test_events_cetus";

    private static final long TIMESTAMP = 1_793_397_544L;

    record Transaction(
            String id,
            String status,
            @JsonProperty("amount_in_cents") long amountInCents) {}

    record Data(Transaction transaction) {}

    record Signature(List<String> properties, String checksum) {}

    record Event(String event, Data data, String environment, Signature signature, long timestamp) {}

    /** An approved transaction event as Wompi signs it, and its checksum. */
    record Signed(String body, String checksum) {}

    @Inject
    ObjectMapper json;

    @Test
    void aSignedEventIsStoredOnceAndHandedToTheWorker() throws Exception {
        Signed event = event(EVENTS_SECRET, "test");

        post(event.body()).then().statusCode(200);
        post(event.body()).then().statusCode(200);

        List<InboundWebhookEventEntity> stored = QuarkusTransaction.requiringNew()
                .call(() -> InboundWebhookEventEntity.<InboundWebhookEventEntity>list(
                        "eventId", event.checksum().toLowerCase()));
        assertThat(stored).hasSize(1);
        assertThat(stored.getFirst().provider).isEqualTo(InboundWebhookEventEntity.Provider.WOMPI);
        assertThat(stored.getFirst().status).isEqualTo(InboundWebhookEventEntity.Status.RECEIVED);
        UUID eventId = stored.getFirst().id;
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() -> JobEntity.count(
                                "jobType = ?1 and referenceId = ?2", JobTypes.PROCESS_WEBHOOK_EVENT, eventId)))
                .isEqualTo(1);
    }

    @Test
    void aForgedEventIsRefusedAndNotStored() throws Exception {
        Signed forged = event("test_events_forged", "test");

        post(forged.body()).then().statusCode(401).body("code", equalTo("invalid_signature"));
        post("not json").then().statusCode(401);

        assertThat(storedFor(forged)).isZero();
    }

    @Test
    void anEventOfTheOtherEnvironmentIsAcknowledgedButNotStored() throws Exception {
        Signed event = event(EVENTS_SECRET, "prod");

        post(event.body()).then().statusCode(200);

        assertThat(storedFor(event)).isZero();
    }

    private static Response post(String body) {
        return given().contentType(ContentType.JSON).body(body).post("/internal/webhooks/wompi");
    }

    private static long storedFor(Signed event) {
        return QuarkusTransaction.requiringNew()
                .call(() -> InboundWebhookEventEntity.count(
                        "eventId", event.checksum().toLowerCase()));
    }

    /** An approved transaction.updated event of a new transaction, signed as Wompi does with {@code secret}. */
    private Signed event(String secret, String environment) throws Exception {
        String transactionId = "12239576-" + System.nanoTime() + "-"
                + ThreadLocalRandom.current().nextInt(100_000);
        String checksum = HexFormat.of()
                .formatHex(MessageDigest.getInstance("SHA-256")
                        .digest((transactionId + "APPROVED" + 2_490_000 + TIMESTAMP + secret)
                                .getBytes(StandardCharsets.UTF_8)))
                .toUpperCase();
        String body = json.writeValueAsString(new Event(
                "transaction.updated",
                new Data(new Transaction(transactionId, "APPROVED", 2_490_000)),
                environment,
                new Signature(List.of("transaction.id", "transaction.status", "transaction.amount_in_cents"), checksum),
                TIMESTAMP));
        return new Signed(body, checksum);
    }
}
