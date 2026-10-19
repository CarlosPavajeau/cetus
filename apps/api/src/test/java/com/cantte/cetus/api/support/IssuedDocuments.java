package com.cantte.cetus.api.support;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;

/** A TEST issuer with an API key, and invoices left as the worker leaves them once accepted and delivered. */
public final class IssuedDocuments {

    private IssuedDocuments() {
    }

    public record Issuer(String id, String apiKey) {
    }

    public static Issuer issuer(String name) {
        return issuer(ConsoleUser.newOrganization(), name);
    }

    /** Like {@link #issuer(String)}, for a console user the test keeps using. */
    public static Issuer issuer(ConsoleUser user, String name) {
        ConsoleFixtures.bootstrap(user, name);
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        String key = user.request().body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then().statusCode(200).extract().path("secret");
        return new Issuer(issuerId, key);
    }

    /** Creates an invoice through the API, still RECEIVED; returns its id. */
    public static UUID invoice(Issuer issuer) {
        Map<String, Object> invoice = Map.of(
                "issuerId", issuer.id(),
                "customer", Map.of(
                        "personType", "NATURAL_PERSON",
                        "identificationType", "CITIZEN_ID",
                        "identificationNumber", "1020304050",
                        "legalName", "Consumidor Final"),
                "payment", Map.of("method", "CASH", "meansCode", "10"),
                "lines", List.of(Map.of("itemCode", "SERV-1", "description", "Servicio", "quantity", 1, "unitPrice", 100000,
                        "taxes", List.of(Map.of("type", "IVA", "percent", 19)))));
        String id = api(issuer.apiKey()).header("Idempotency-Key", UUID.randomUUID().toString()).body(invoice)
                .post("/v1/invoices")
                .then().statusCode(202).extract().path("id");
        return UUID.fromString(id);
    }

    public static void accept(UUID documentId) {
        QuarkusTransaction.requiringNew().run(() ->
                DocumentEntity.<DocumentEntity>findById(documentId).status = DocumentStatus.ACCEPTED);
    }

    /** Records an artifact as the worker does; the file itself lives in the fake S3 under this key. */
    public static String artifact(UUID documentId, DocumentArtifactEntity.Kind kind, String fileName) {
        return QuarkusTransaction.requiringNew().call(() -> {
            DocumentArtifactEntity artifact = new DocumentArtifactEntity();
            artifact.id = Ids.newId();
            artifact.documentId = documentId;
            artifact.kind = kind;
            artifact.s3Key = "documents/test/900123456/2026/10/" + documentId + "/" + fileName;
            artifact.sha256 = "0".repeat(64);
            artifact.sizeBytes = 10;
            artifact.contentType = "application/octet-stream";
            artifact.persist();
            return artifact.s3Key;
        });
    }

    /** A delivery the worker handed to Resend, which knows it by {@code messageId}. */
    public static UUID sentDelivery(UUID documentId, String messageId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            DocumentDeliveryEntity delivery = new DocumentDeliveryEntity();
            delivery.id = Ids.newId();
            delivery.documentId = documentId;
            delivery.recipient = "cliente@example.com";
            delivery.status = DocumentDeliveryEntity.Status.SENT;
            delivery.attempts = 1;
            delivery.providerMessageId = messageId;
            delivery.sentAt = java.time.OffsetDateTime.now();
            delivery.persist();
            return delivery.id;
        });
    }

    public static DocumentDeliveryEntity delivery(UUID deliveryId) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentDeliveryEntity.findById(deliveryId));
    }

    public static RequestSpecification api(String apiKey) {
        return given().header("Authorization", "Bearer " + apiKey).contentType(ContentType.JSON);
    }
}
