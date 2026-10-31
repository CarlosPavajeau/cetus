package com.cantte.cetus.api.email;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

/**
 * Resend delivery events, signed like Svix does with the test-only secret of application.properties: stored once
 * each and handed to the worker, which moves the deliveries (see the worker's EmailEventsTest).
 */
@QuarkusTest
class EmailEventResourceTest {

    private static final byte[] KEY = Base64.getDecoder().decode("Y2V0dXMtdGVzdC1vbmx5LXdlYmhvb2stc2VjcmV0IQ==");

    record Data(@JsonProperty("email_id") String emailId, List<String> to) {}

    record Event(String type, @JsonProperty("created_at") String createdAt, Data data) {}

    @Inject
    ObjectMapper json;

    @Test
    void aDeliveryEventIsStoredOnceAndHandedToTheWorker() throws Exception {
        String svixId = "msg_" + UUID.randomUUID();
        String body = event("email.bounced");

        post(svixId, body).then().statusCode(200);
        post(svixId, body).then().statusCode(200);

        List<InboundWebhookEventEntity> stored = storedFor(svixId);
        assertThat(stored).hasSize(1);
        assertThat(stored.getFirst().provider).isEqualTo(InboundWebhookEventEntity.Provider.RESEND);
        assertThat(stored.getFirst().eventType).isEqualTo("email.bounced");
        UUID eventId = stored.getFirst().id;
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() -> JobEntity.count(
                                "jobType = ?1 and referenceId = ?2", JobTypes.PROCESS_WEBHOOK_EVENT, eventId)))
                .isEqualTo(1);
    }

    @Test
    void otherEventTypesAreAcknowledgedButNotStored() throws Exception {
        String svixId = "msg_" + UUID.randomUUID();

        post(svixId, event("email.opened")).then().statusCode(200);

        assertThat(storedFor(svixId)).isEmpty();
    }

    @Test
    void aForgedOrReplayedEventIsRefused() throws Exception {
        String body = event("email.bounced");
        String svixId = "msg_" + UUID.randomUUID();
        String now = String.valueOf(System.currentTimeMillis() / 1000);

        given().contentType(ContentType.JSON)
                .header("svix-id", svixId)
                .header("svix-timestamp", now)
                .header("svix-signature", "v1," + sign(svixId, now, body.replace("bounced", "delivered")))
                .body(body)
                .post("/internal/email-events")
                .then()
                .statusCode(401)
                .body("code", equalTo("invalid_signature"));

        String old = String.valueOf(System.currentTimeMillis() / 1000 - 3600);
        given().contentType(ContentType.JSON)
                .header("svix-id", svixId)
                .header("svix-timestamp", old)
                .header("svix-signature", "v1," + sign(svixId, old, body))
                .body(body)
                .post("/internal/email-events")
                .then()
                .statusCode(401);

        given().contentType(ContentType.JSON)
                .body(body)
                .post("/internal/email-events")
                .then()
                .statusCode(401);

        assertThat(storedFor(svixId)).isEmpty();
    }

    private static List<InboundWebhookEventEntity> storedFor(String svixId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> InboundWebhookEventEntity.<InboundWebhookEventEntity>list(
                        "provider = ?1 and eventId = ?2", InboundWebhookEventEntity.Provider.RESEND, svixId));
    }

    private static Response post(String svixId, String body) {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        return given().contentType(ContentType.JSON)
                .header("svix-id", svixId)
                .header("svix-timestamp", timestamp)
                .header("svix-signature", "v1," + sign(svixId, timestamp, body))
                .body(body)
                .post("/internal/email-events");
    }

    private String event(String type) throws JsonProcessingException {
        return json.writeValueAsString(new Event(
                type,
                "2026-10-19T15:00:00.000Z",
                new Data("email-" + UUID.randomUUID(), List.of("cliente@example.com"))));
    }

    private static String sign(String id, String timestamp, String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(KEY, "HmacSHA256"));
            return Base64.getEncoder()
                    .encodeToString(mac.doFinal((id + "." + timestamp + "." + body).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
