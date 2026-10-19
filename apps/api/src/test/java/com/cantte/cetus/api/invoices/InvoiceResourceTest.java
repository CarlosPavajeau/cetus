package com.cantte.cetus.api.invoices;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class InvoiceResourceTest {

    @Test
    void createReturnsTheStoredCreationTime() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Invoices SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        String apiKey = user.request().body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then().statusCode(200).extract().path("secret");
        String idempotencyKey = UUID.randomUUID().toString();

        JsonPath created = api(apiKey).header("Idempotency-Key", idempotencyKey).body(invoice(issuerId))
                .post("/v1/invoices")
                .then().statusCode(202).extract().jsonPath();
        String createdAt = created.getString("createdAt");

        JsonPath fetched = api(apiKey).get("/v1/invoices/" + created.getString("id"))
                .then().statusCode(200).extract().jsonPath();
        assertThat(fetched.getString("createdAt")).as("same value as stored").isEqualTo(createdAt);

        JsonPath replayed = api(apiKey).header("Idempotency-Key", idempotencyKey).body(invoice(issuerId))
                .post("/v1/invoices")
                .then().statusCode(202).header("Idempotent-Replayed", "true").extract().jsonPath();
        assertThat(replayed.getString("createdAt")).isEqualTo(createdAt);
    }

    @Test
    void theIssuerCanBeLeftOutWhenOnlyOneCanIssue() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Single issuer SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        // Still being set up: it cannot issue, so it is not a candidate.
        ConsoleFixtures.createIssuer(user, "800197268");
        String apiKey = testKey(user);

        api(apiKey).header("Idempotency-Key", UUID.randomUUID().toString()).body(invoice(null))
                .post("/v1/invoices")
                .then().statusCode(202)
                .body("issuerId", equalTo(issuerId));
    }

    @Test
    void theIssuerIsRequiredWhenSeveralCanIssue() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Several issuers SAS");
        ConsoleFixtures.onboard(user);
        ConsoleFixtures.onboard(user, "800197268");
        String apiKey = testKey(user);

        api(apiKey).header("Idempotency-Key", UUID.randomUUID().toString()).body(invoice(null))
                .post("/v1/invoices")
                .then().statusCode(422)
                .body("code", equalTo("issuer_required"));
    }

    @Test
    void withoutAnIssuerAbleToIssueTheIssuerIsNotFound() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "No issuer SAS");
        ConsoleFixtures.createIssuer(user);
        String apiKey = testKey(user);

        api(apiKey).header("Idempotency-Key", UUID.randomUUID().toString()).body(invoice(null))
                .post("/v1/invoices")
                .then().statusCode(422)
                .body("code", equalTo("issuer_not_found"));
    }

    @Test
    void everyLineNeedsAnItemCode() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Item code SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        String apiKey = testKey(user);
        Map<String, Object> invoice = invoice(issuerId);
        // The DIAN rejects lines without StandardItemIdentification (FAZ09), so it is caught here instead.
        invoice.put("lines", List.of(Map.of("description", "Servicio", "quantity", 1, "unitPrice", 100000)));

        List<String> details = api(apiKey).header("Idempotency-Key", UUID.randomUUID().toString()).body(invoice)
                .post("/v1/invoices")
                .then().statusCode(400)
                .body("code", equalTo("invalid_request"))
                .extract().jsonPath().getList("details", String.class);
        assertThat(details).anyMatch(detail -> detail.contains("itemCode"));
    }

    private static String testKey(ConsoleUser user) {
        return user.request().body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then().statusCode(200).extract().path("secret");
    }

    private static RequestSpecification api(String apiKey) {
        return given().header("Authorization", "Bearer " + apiKey).contentType(ContentType.JSON);
    }

    /** An invoice for the issuer, or without one when it is null. */
    private static Map<String, Object> invoice(String issuerId) {
        Map<String, Object> invoice = new HashMap<>(Map.of(
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
                        "unitPrice", 100000,
                        "taxes", List.of(Map.of("type", "IVA", "percent", 19))))));
        if (issuerId != null) {
            invoice.put("issuerId", issuerId);
        }
        return invoice;
    }
}
