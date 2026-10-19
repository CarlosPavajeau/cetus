package com.cantte.cetus.api.console;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.cantte.cetus.api.support.ConsoleFixtures.PIN;
import static com.cantte.cetus.api.support.ConsoleFixtures.SOFTWARE_ID;
import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

/** The issuer detail counts what was sent to its current test set, so the console can show the progress. */
@QuarkusTest
class TestSetProgressTest {

    @Test
    void countsTheTestSetDocumentsByTypeAndOutcome() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Test set SAS");
        String issuerId = onboard(user).issuerId();
        String apiKey = testKey(user);
        String accepted = sendInvoice(apiKey, issuerId);
        String rejected = sendInvoice(apiKey, issuerId);
        sendInvoice(apiKey, issuerId);
        setStatus(accepted, DocumentStatus.ACCEPTED);
        setStatus(rejected, DocumentStatus.REJECTED);

        JsonPath detail = detail(user, issuerId);
        assertThat(detail.getString("testSet.testSetId")).isEqualTo(detail.getString("software.testSetId"));
        assertThat(detail.getString("testSet.since")).isNotBlank();
        assertThat(detail.getList("testSet.documents.documentType"))
                .containsExactly("INVOICE", "CREDIT_NOTE", "DEBIT_NOTE");
        assertThat(detail.getMap("testSet.documents[0]")).containsAllEntriesOf(Map.of(
                "accepted", 1, "rejected", 1, "inProgress", 1, "failed", 0));
        assertThat(detail.getMap("testSet.documents[1]")).containsAllEntriesOf(Map.of(
                "accepted", 0, "rejected", 0, "inProgress", 0, "failed", 0));
    }

    @Test
    void aNewTestSetStartsOverButTheSameOneKeepsCounting() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "New test set SAS");
        String issuerId = onboard(user).issuerId();
        sendInvoice(testKey(user), issuerId);
        String testSetId = detail(user, issuerId).getString("software.testSetId");

        setSoftware(user, issuerId, testSetId);
        assertThat(detail(user, issuerId).getInt("testSet.documents[0].inProgress")).isEqualTo(1);

        setSoftware(user, issuerId, UUID.randomUUID().toString());
        assertThat(detail(user, issuerId).getInt("testSet.documents[0].inProgress")).isZero();
    }

    @Test
    void anAcceptedTestSetTakesNoMoreTestInvoicesUntilANewOne() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Accepted test set SAS");
        String issuerId = onboard(user).issuerId();
        String apiKey = testKey(user);
        assertThat(detail(user, issuerId).getString("testSet.acceptedAt")).isNull();
        String testSetId = detail(user, issuerId).getString("software.testSetId");

        // What the worker records when GetStatusZip says the set "se encuentra Aceptado".
        QuarkusTransaction.requiringNew().run(() ->
                SoftwareCredentialEntity.markTestSetAccepted(UUID.fromString(issuerId), testSetId));

        assertThat(detail(user, issuerId).getString("testSet.acceptedAt")).isNotBlank();
        invoiceRequest(apiKey, issuerId).post("/v1/invoices")
                .then().statusCode(422)
                .body("code", equalTo("test_set_accepted"));

        // Saving the same set again keeps it accepted; a new set takes invoices again.
        setSoftware(user, issuerId, testSetId);
        invoiceRequest(apiKey, issuerId).post("/v1/invoices").then().statusCode(422);
        setSoftware(user, issuerId, UUID.randomUUID().toString());
        assertThat(detail(user, issuerId).getString("testSet.acceptedAt")).isNull();
        invoiceRequest(apiKey, issuerId).post("/v1/invoices").then().statusCode(202);
    }

    @Test
    void withoutATestSetThereIsNoProgress() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "No test set SAS");
        String issuerId = onboard(user).issuerId();

        setSoftware(user, issuerId, null);
        assertThat(detail(user, issuerId).getMap("testSet")).isNull();
    }

    private static JsonPath detail(ConsoleUser user, String issuerId) {
        return user.request().get("/console/issuers/" + issuerId).then().statusCode(200).extract().jsonPath();
    }

    private static void setSoftware(ConsoleUser user, String issuerId, String testSetId) {
        Map<String, Object> request = new HashMap<>(Map.of("softwareId", SOFTWARE_ID, "pin", PIN));
        request.put("testSetId", testSetId);
        user.request().body(request).put("/console/issuers/" + issuerId + "/software").then().statusCode(200);
    }

    private static String testKey(ConsoleUser user) {
        return user.request().body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then().statusCode(200).extract().path("secret");
    }

    private static String sendInvoice(String apiKey, String issuerId) {
        return invoiceRequest(apiKey, issuerId).post("/v1/invoices")
                .then().statusCode(202).extract().path("id");
    }

    private static RequestSpecification invoiceRequest(String apiKey, String issuerId) {
        Map<String, Object> invoice = Map.of(
                "issuerId", issuerId,
                "customer", Map.of(
                        "personType", "NATURAL_PERSON",
                        "identificationType", "CITIZEN_ID",
                        "identificationNumber", "1020304050",
                        "legalName", "Consumidor Final"),
                "payment", Map.of("method", "CASH", "meansCode", "10"),
                "lines", List.of(Map.of(
                        "itemCode", "SERV-1",
                        "description", "Servicio",
                        "quantity", 1,
                        "unitPrice", 100000)));
        return given().header("Authorization", "Bearer " + apiKey).contentType(ContentType.JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString()).body(invoice);
    }

    /** What the worker records once the DIAN answers. */
    private static void setStatus(String documentId, DocumentStatus status) {
        QuarkusTransaction.requiringNew().run(() ->
                DocumentEntity.update("status = ?1 where id = ?2", status, UUID.fromString(documentId)));
    }
}
