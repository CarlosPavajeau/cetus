package com.cantte.cetus.api.console;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.IssuedDocuments;
import com.cantte.cetus.api.support.IssuedDocuments.Issuer;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class DocumentResendTest {

    @Test
    void anAcceptedDocumentIsEmailedAgainToAnotherAddressOnceAMinute() {
        ConsoleUser user = ConsoleUser.newOrganization();
        Issuer issuer = IssuedDocuments.issuer(user, "Reenvio SAS");
        UUID invoiceId = IssuedDocuments.invoice(issuer);
        IssuedDocuments.accept(invoiceId);

        resend(user, invoiceId, Map.of()).then().statusCode(422).body("code", equalTo("delivery_in_progress"));

        IssuedDocuments.sentDelivery(invoiceId, "msg-" + UUID.randomUUID());
        resend(user, invoiceId, Map.of("email", "contabilidad@example.com"))
                .then()
                .statusCode(429)
                .body("code", equalTo("delivery_too_soon"));

        age(invoiceId);
        String deliveryId = resend(user, invoiceId, Map.of("email", "contabilidad@example.com"))
                .then()
                .statusCode(202)
                .body("status", equalTo("PENDING"))
                .body("recipient", equalTo("contabilidad@example.com"))
                .extract()
                .path("id");

        JobEntity job = QuarkusTransaction.requiringNew()
                .call(() -> JobEntity.<JobEntity>find("referenceId", UUID.fromString(deliveryId))
                        .firstResult());
        assertThat(job.jobType).isEqualTo(JobTypes.RESEND_DOCUMENT);

        // The resend is still pending: another one waits for it.
        resend(user, invoiceId, Map.of()).then().statusCode(422).body("code", equalTo("delivery_in_progress"));

        assertThat(AuditTrailTest.entries(user, "DOCUMENT_RESENT"))
                .singleElement()
                .satisfies(entry -> assertThat(entry).containsEntry("resourceId", invoiceId.toString()));
    }

    @Test
    void onlyAcceptedDocumentsAreEmailedAgainAndNeverWhileImpersonating() {
        ConsoleUser user = ConsoleUser.newOrganization();
        Issuer issuer = IssuedDocuments.issuer(user, "Pendiente Reenvio SAS");
        UUID invoiceId = IssuedDocuments.invoice(issuer);

        resend(user, invoiceId, Map.of()).then().statusCode(422).body("code", equalTo("document_not_accepted"));
        resend(user, invoiceId, Map.of("email", "no es un correo")).then().statusCode(400);

        IssuedDocuments.accept(invoiceId);
        IssuedDocuments.sentDelivery(invoiceId, "msg-" + UUID.randomUUID());
        age(invoiceId);
        user.impersonatedBy("user_" + UUID.randomUUID())
                .body(Map.of())
                .post("/console/documents/" + invoiceId + "/deliveries")
                .then()
                .statusCode(403)
                .body("code", equalTo("impersonation_forbidden"));

        UUID foreign = IssuedDocuments.invoice(IssuedDocuments.issuer("Ajena Reenvio SAS"));
        resend(user, foreign, Map.of()).then().statusCode(404);
    }

    @Test
    void aSandboxDocumentTakesNoAddress() {
        ConsoleUser user = ConsoleUser.newOrganization();
        Issuer issuer = IssuedDocuments.issuer(user, "Simulado Reenvio SAS");
        UUID invoiceId = IssuedDocuments.invoice(issuer);
        IssuedDocuments.accept(invoiceId);
        IssuedDocuments.sentDelivery(invoiceId, "msg-" + UUID.randomUUID());
        age(invoiceId);
        QuarkusTransaction.requiringNew()
                .run(() -> DocumentEntity.<DocumentEntity>findById(invoiceId).environment = Environment.SANDBOX);

        resend(user, invoiceId, Map.of("email", "otro@example.com"))
                .then()
                .statusCode(422)
                .body("code", equalTo("sandbox_recipient"));
        resend(user, invoiceId, Map.of()).then().statusCode(202).body("recipient", equalTo(null));
    }

    private static Response resend(ConsoleUser user, UUID documentId, Map<String, Object> body) {
        return user.request().body(body).post("/console/documents/" + documentId + "/deliveries");
    }

    /** Moves the document's deliveries a couple of minutes back, past the wait between resends. */
    private static void age(UUID documentId) {
        QuarkusTransaction.requiringNew()
                .run(() -> DocumentDeliveryEntity.getEntityManager()
                        .createNativeQuery("UPDATE billing.document_deliveries SET created_at = now() - interval"
                                + " '2 minutes' WHERE document_id = :document")
                        .setParameter("document", documentId)
                        .executeUpdate());
    }
}
