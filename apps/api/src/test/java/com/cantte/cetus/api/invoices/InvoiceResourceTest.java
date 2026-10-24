package com.cantte.cetus.api.invoices;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import io.restassured.specification.RequestSpecification;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

@QuarkusTest
class InvoiceResourceTest {

    @Test
    void createReturnsTheStoredCreationTime() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Invoices SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        String apiKey = user.request()
                .body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("secret");
        String idempotencyKey = UUID.randomUUID().toString();

        JsonPath created = api(apiKey)
                .header("Idempotency-Key", idempotencyKey)
                .body(invoice(issuerId))
                .post("/v1/invoices")
                .then()
                .statusCode(202)
                .extract()
                .jsonPath();
        String createdAt = created.getString("createdAt");

        JsonPath fetched = api(apiKey)
                .get("/v1/invoices/" + created.getString("id"))
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertThat(fetched.getString("createdAt")).as("same value as stored").isEqualTo(createdAt);

        JsonPath replayed = api(apiKey)
                .header("Idempotency-Key", idempotencyKey)
                .body(invoice(issuerId))
                .post("/v1/invoices")
                .then()
                .statusCode(202)
                .header("Idempotent-Replayed", "true")
                .extract()
                .jsonPath();
        assertThat(replayed.getString("createdAt")).isEqualTo(createdAt);
    }

    @Test
    void anIdempotencyKeyUsedInTestDoesNotReplayInLive() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Two environments SAS");
        String testIssuer = ConsoleFixtures.onboard(user).issuerId();
        String liveIssuer = ConsoleFixtures.completeSetup(user, ConsoleFixtures.createIssuer(user, "900123456", "LIVE"))
                .issuerId();
        String testKey = testKey(user);
        String liveKey = user.request()
                .body(Map.of("name", "ERP", "environment", "LIVE"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("secret");
        String idempotencyKey = "order-" + UUID.randomUUID();

        JsonPath inTest = api(testKey)
                .header("Idempotency-Key", idempotencyKey)
                .body(invoice(testIssuer))
                .post("/v1/invoices")
                .then()
                .statusCode(202)
                .extract()
                .jsonPath();
        JsonPath inLive = api(liveKey)
                .header("Idempotency-Key", idempotencyKey)
                .body(invoice(liveIssuer))
                .post("/v1/invoices")
                .then()
                .statusCode(202)
                .header("Idempotent-Replayed", (String) null)
                .extract()
                .jsonPath();

        assertThat(inLive.getString("id")).isNotEqualTo(inTest.getString("id"));
        assertThat(inLive.getString("environment")).isEqualTo("LIVE");
    }

    @Test
    void theIssuerCanBeLeftOutWhenOnlyOneCanIssue() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Single issuer SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        // Still being set up: it cannot issue, so it is not a candidate.
        ConsoleFixtures.createIssuer(user, "800197268");
        String apiKey = testKey(user);

        api(apiKey)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoice(null))
                .post("/v1/invoices")
                .then()
                .statusCode(202)
                .body("issuerId", equalTo(issuerId));
    }

    @Test
    void theIssuerIsRequiredWhenSeveralCanIssue() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Several issuers SAS");
        ConsoleFixtures.onboard(user);
        ConsoleFixtures.onboard(user, "800197268");
        String apiKey = testKey(user);

        api(apiKey)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoice(null))
                .post("/v1/invoices")
                .then()
                .statusCode(422)
                .body("code", equalTo("issuer_required"));
    }

    @Test
    void withoutAnIssuerAbleToIssueTheIssuerIsNotFound() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "No issuer SAS");
        ConsoleFixtures.createIssuer(user);
        String apiKey = testKey(user);

        api(apiKey)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoice(null))
                .post("/v1/invoices")
                .then()
                .statusCode(422)
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

        List<String> fields = api(apiKey)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoice)
                .post("/v1/invoices")
                .then()
                .statusCode(400)
                .body("code", equalTo("invalid_request"))
                .extract()
                .jsonPath()
                .getList("errors.field", String.class);
        assertThat(fields).anyMatch(field -> field.endsWith("itemCode"));
    }

    @Test
    void aNullLineOrTaxIsAFieldError() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Null line SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        String apiKey = testKey(user);
        Map<String, Object> nullLine = invoice(issuerId);
        nullLine.put("lines", Collections.singletonList(null));
        Map<String, Object> nullTax = invoice(issuerId);
        Map<String, Object> line = new HashMap<>(
                Map.of("itemCode", "SERV-1", "description", "Servicio", "quantity", 1, "unitPrice", 100000));
        line.put("taxes", Collections.singletonList(null));
        nullTax.put("lines", List.of(line));

        for (Map<String, Object> invoice : List.of(nullLine, nullTax)) {
            api(apiKey)
                    .header("Idempotency-Key", UUID.randomUUID().toString())
                    .body(invoice)
                    .post("/v1/invoices")
                    .then()
                    .statusCode(400)
                    .body("code", equalTo("invalid_request"));
        }
    }

    @Test
    @Timeout(30)
    void hugeExponentsAreRefusedBeforeAnyArithmetic() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Exponent SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        String apiKey = testKey(user);
        // A dozen characters of JSON that would make BigDecimal.setScale build a number of a billion digits.
        for (String line : List.of(
                "\"quantity\": 1e999999999, \"unitPrice\": 1",
                "\"quantity\": 1, \"unitPrice\": 1e999999999",
                "\"quantity\": 1, \"unitPrice\": 1, \"taxes\": [{\"type\": \"IVA\", \"percent\": 1e-999999999}]")) {
            String body = """
                    {"issuerId": "%s",
                     "customer": {"personType": "NATURAL_PERSON", "identificationType": "CITIZEN_ID",
                                  "identificationNumber": "1020304050", "legalName": "Consumidor Final"},
                     "payment": {"method": "CASH", "meansCode": "10"},
                     "lines": [{"itemCode": "SERV-1", "description": "Servicio", %s}]}
                    """.formatted(issuerId, line);
            api(apiKey)
                    .header("Idempotency-Key", UUID.randomUUID().toString())
                    .body(body)
                    .post("/v1/invoices")
                    .then()
                    .statusCode(400)
                    .body("code", equalTo("invalid_request"));
        }
    }

    @Test
    void aTotalTheDatabaseCannotStoreIsRefused() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Big total SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        String apiKey = testKey(user);
        Map<String, Object> invoice = invoice(issuerId);
        invoice.put(
                "lines",
                List.of(Map.of(
                        "itemCode",
                        "SERV-1",
                        "description",
                        "Servicio",
                        "quantity",
                        99999999999999L,
                        "unitPrice",
                        99999999999999L)));

        api(apiKey)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoice)
                .post("/v1/invoices")
                .then()
                .statusCode(422)
                .body("code", equalTo("amount_too_large"));
    }

    @Test
    void theIdentificationNumberFollowsTheFormatOfItsType() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Identification SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        String apiKey = testKey(user);

        // A line break would add a line of its own to the QR, such as a URL scanners open before the DIAN's.
        for (Map.Entry<String, String> id : List.of(
                Map.entry("PASSPORT", "1\nhttps://ev.il"),
                Map.entry("NIT", "90012A"),
                Map.entry("CITIZEN_ID", "10 20 30"))) {
            api(apiKey)
                    .header("Idempotency-Key", UUID.randomUUID().toString())
                    .body(invoiceWithCustomer(
                            issuerId, Map.of("identificationType", id.getKey(), "identificationNumber", id.getValue())))
                    .post("/v1/invoices")
                    .then()
                    .statusCode(422)
                    .body("code", equalTo("customer_identification_invalid"));
        }

        api(apiKey)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoiceWithCustomer(
                        issuerId, Map.of("identificationType", "PASSPORT", "identificationNumber", "AB-123456")))
                .post("/v1/invoices")
                .then()
                .statusCode(202);
    }

    @Test
    void textCannotCarryControlCharactersOrBidirectionalOverrides() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Control chars SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        String apiKey = testKey(user);

        for (String legalName : List.of("Acme\u0001", "Acme\u0000", "Acme ‮moc.live")) {
            api(apiKey)
                    .header("Idempotency-Key", UUID.randomUUID().toString())
                    .body(invoiceWithCustomer(issuerId, Map.of("legalName", legalName)))
                    .post("/v1/invoices")
                    .then()
                    .statusCode(400)
                    .body("code", equalTo("invalid_request"))
                    .body("errors.field", contains("customer.legalName"))
                    .body(
                            "errors.message",
                            contains("Text cannot contain control characters or bidirectional overrides"));
        }
    }

    @Test
    void aValueOfTheWrongTypeNamesTheFieldAsSent() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Wrong type SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        String apiKey = testKey(user);
        Map<String, Object> wrongQuantity = invoice(issuerId);
        wrongQuantity.put(
                "lines",
                List.of(Map.of(
                        "itemCode", "SERV-1", "description", "Servicio", "quantity", "one", "unitPrice", 100000)));
        Map<String, Object> wrongIssuer = invoice("not-a-uuid");
        Map<String, Object> wrongLines = invoice(issuerId);
        wrongLines.put("lines", Map.of("itemCode", "SERV-1"));

        Map<Map<String, Object>, List<String>> cases = Map.of(
                wrongQuantity, List.of("lines[0].quantity", "must be a number"),
                wrongIssuer, List.of("issuerId", "must be a UUID"),
                wrongLines, List.of("lines", "must be a list"));
        cases.forEach((invoice, error) -> api(apiKey)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoice)
                .post("/v1/invoices")
                .then()
                .statusCode(400)
                .contentType("application/problem+json")
                .body("code", equalTo("invalid_request"))
                .body("errors.field", contains(error.get(0)))
                .body("errors.message", contains(error.get(1))));
    }

    @Test
    void listsAndTheIdempotencyKeyAreBounded() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Bounds SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        String apiKey = testKey(user);

        api(apiKey)
                .header("Idempotency-Key", "k".repeat(101))
                .body(invoice(issuerId))
                .post("/v1/invoices")
                .then()
                .statusCode(400);

        Map<String, Object> manyNotes = invoice(issuerId);
        manyNotes.put("notes", Collections.nCopies(21, "Nota"));
        api(apiKey)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(manyNotes)
                .post("/v1/invoices")
                .then()
                .statusCode(400);

        // Tax level codes are joined with ";" in the XML: one code cannot smuggle in another.
        api(apiKey)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoiceWithCustomer(issuerId, Map.of("taxLevelCodes", List.of("O-13;O-15"))))
                .post("/v1/invoices")
                .then()
                .statusCode(400);
    }

    private static String testKey(ConsoleUser user) {
        return user.request()
                .body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("secret");
    }

    private static RequestSpecification api(String apiKey) {
        return given().header("Authorization", "Bearer " + apiKey).contentType(ContentType.JSON);
    }

    /** An invoice for the issuer, or without one when it is null. */
    private static Map<String, Object> invoice(String issuerId) {
        Map<String, Object> invoice = new HashMap<>(Map.of(
                "customer",
                        Map.of(
                                "personType", "NATURAL_PERSON",
                                "identificationType", "CITIZEN_ID",
                                "identificationNumber", "1020304050",
                                "legalName", "Consumidor Final"),
                "payment", Map.of("method", "CASH", "meansCode", "10"),
                "lines",
                        List.of(Map.of(
                                "itemCode",
                                "SERV-1",
                                "description",
                                "Servicio",
                                "quantity",
                                1,
                                "unitPrice",
                                100000,
                                "taxes",
                                List.of(Map.of("type", "IVA", "percent", 19))))));
        if (issuerId != null) {
            invoice.put("issuerId", issuerId);
        }
        return invoice;
    }

    /** The invoice with some customer fields replaced. */
    @SuppressWarnings("unchecked")
    private static Map<String, Object> invoiceWithCustomer(String issuerId, Map<String, Object> fields) {
        Map<String, Object> invoice = invoice(issuerId);
        Map<String, Object> customer = new HashMap<>((Map<String, Object>) invoice.get("customer"));
        customer.putAll(fields);
        invoice.put("customer", customer);
        return invoice;
    }
}
