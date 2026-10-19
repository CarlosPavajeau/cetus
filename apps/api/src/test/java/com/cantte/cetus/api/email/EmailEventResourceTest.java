package com.cantte.cetus.api.email;

import com.cantte.cetus.api.support.IssuedDocuments;
import com.cantte.cetus.api.support.IssuedDocuments.Issuer;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity.Status;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

import static com.cantte.cetus.api.support.IssuedDocuments.api;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

/** Resend delivery events, signed like Svix does with the test-only secret of application.properties. */
@QuarkusTest
class EmailEventResourceTest {

    private static final byte[] KEY = Base64.getDecoder().decode("Y2V0dXMtdGVzdC1vbmx5LXdlYmhvb2stc2VjcmV0IQ==");

    @Test
    void aDeliveredEventMarksTheDeliveryAndShowsInTheInvoice() {
        Issuer issuer = IssuedDocuments.issuer("Delivered SAS");
        UUID invoice = IssuedDocuments.invoice(issuer);
        String emailId = "email-" + UUID.randomUUID();
        UUID deliveryId = IssuedDocuments.sentDelivery(invoice, emailId);

        post(event("email.delivered", emailId, "")).then().statusCode(200);

        DocumentDeliveryEntity delivery = IssuedDocuments.delivery(deliveryId);
        assertThat(delivery.status).isEqualTo(Status.DELIVERED);
        assertThat(delivery.lastEventAt).isNotNull();
        api(issuer.apiKey()).get("/v1/invoices/" + invoice).then().statusCode(200)
                .body("deliveries[0].status", equalTo("DELIVERED"))
                .body("deliveries[0].recipient", equalTo("cliente@example.com"))
                .body("deliveries[0].channel", equalTo("EMAIL"));
    }

    @Test
    void aBounceKeepsItsReasonAndALateDeliveredDoesNotHideIt() {
        Issuer issuer = IssuedDocuments.issuer("Bounced SAS");
        UUID invoice = IssuedDocuments.invoice(issuer);
        String emailId = "email-" + UUID.randomUUID();
        UUID deliveryId = IssuedDocuments.sentDelivery(invoice, emailId);

        post(event("email.bounced", emailId, ",\"bounce\":{\"message\":\"Mailbox does not exist\",\"type\":\"Permanent\"}"))
                .then().statusCode(200);
        post(event("email.delivered", emailId, "")).then().statusCode(200);

        DocumentDeliveryEntity delivery = IssuedDocuments.delivery(deliveryId);
        assertThat(delivery.status).isEqualTo(Status.BOUNCED);
        assertThat(delivery.error).isEqualTo("Mailbox does not exist");
    }

    @Test
    void aComplaintIsRecorded() {
        Issuer issuer = IssuedDocuments.issuer("Complained SAS");
        String emailId = "email-" + UUID.randomUUID();
        UUID deliveryId = IssuedDocuments.sentDelivery(IssuedDocuments.invoice(issuer), emailId);

        post(event("email.complained", emailId, "")).then().statusCode(200);

        assertThat(IssuedDocuments.delivery(deliveryId).status).isEqualTo(Status.COMPLAINED);
    }

    @Test
    void otherEventsAndUnknownEmailsAreAcknowledged() {
        post(event("email.opened", "email-unknown", "")).then().statusCode(200);
        post(event("email.delivered", "email-" + UUID.randomUUID(), "")).then().statusCode(200);
    }

    @Test
    void aForgedOrReplayedEventIsRefused() {
        Issuer issuer = IssuedDocuments.issuer("Forged SAS");
        String emailId = "email-" + UUID.randomUUID();
        UUID deliveryId = IssuedDocuments.sentDelivery(IssuedDocuments.invoice(issuer), emailId);
        String body = event("email.bounced", emailId, "");
        String now = String.valueOf(System.currentTimeMillis() / 1000);

        given().contentType(ContentType.JSON).header("svix-id", "msg_1").header("svix-timestamp", now)
                .header("svix-signature", "v1," + sign("msg_1", now, body.replace("bounced", "delivered")))
                .body(body).post("/internal/email-events")
                .then().statusCode(401).body("code", equalTo("invalid_signature"));

        String old = String.valueOf(System.currentTimeMillis() / 1000 - 3600);
        given().contentType(ContentType.JSON).header("svix-id", "msg_1").header("svix-timestamp", old)
                .header("svix-signature", "v1," + sign("msg_1", old, body))
                .body(body).post("/internal/email-events")
                .then().statusCode(401);

        given().contentType(ContentType.JSON).body(body).post("/internal/email-events").then().statusCode(401);

        assertThat(IssuedDocuments.delivery(deliveryId).status).isEqualTo(Status.SENT);
    }

    private static io.restassured.response.Response post(String body) {
        String id = "msg_" + UUID.randomUUID();
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        return given().contentType(ContentType.JSON)
                .header("svix-id", id)
                .header("svix-timestamp", timestamp)
                .header("svix-signature", "v1," + sign(id, timestamp, body))
                .body(body)
                .post("/internal/email-events");
    }

    private static String event(String type, String emailId, String extraData) {
        return "{\"type\":\"" + type + "\",\"created_at\":\"2026-10-19T15:00:00.000Z\",\"data\":{\"email_id\":\""
                + emailId + "\",\"to\":[\"cliente@example.com\"]" + extraData + "}}";
    }

    private static String sign(String id, String timestamp, String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(KEY, "HmacSHA256"));
            return Base64.getEncoder().encodeToString(
                    mac.doFinal((id + "." + timestamp + "." + body).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
