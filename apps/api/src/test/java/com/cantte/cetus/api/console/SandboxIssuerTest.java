package com.cantte.cetus.api.console;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.cantte.cetus.api.support.ConsoleFixtures.CERTIFICATE_PASSWORD;
import static com.cantte.cetus.api.support.ConsoleFixtures.PIN;
import static com.cantte.cetus.api.support.ConsoleFixtures.SOFTWARE_ID;
import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.certificateBase64;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

/** A new account issues in the sandbox right away, without software, certificate or ranges of its own. */
@QuarkusTest
class SandboxIssuerTest {

    @Test
    void everyAccountStartsWithASampleIssuerReadyToIssue() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Sandbox SAS");
        // Bootstrapping again does not add a second one.
        bootstrap(user, "Sandbox SAS");

        List<Map<String, Object>> issuers = user.request().get("/console/issuers")
                .then().statusCode(200).extract().jsonPath().getList("");
        assertThat(issuers).singleElement().satisfies(issuer -> {
            assertThat(issuer).containsEntry("environment", "SANDBOX").containsEntry("nit", "900999999")
                    .containsEntry("checkDigit", "4").containsEntry("status", "ENABLED");
        });
        String issuerId = (String) issuers.getFirst().get("id");
        JsonPath ranges = user.request().get("/console/issuers/" + issuerId + "/numbering-ranges")
                .then().statusCode(200).extract().jsonPath();
        assertThat(ranges.getList("documentType")).containsExactlyInAnyOrder("INVOICE", "CREDIT_NOTE", "DEBIT_NOTE");
        assertThat(ranges.getList("prefix")).containsExactlyInAnyOrder("SIM", "NCS", "NDS");
    }

    @Test
    void aSandboxKeyIssuesWithTheSampleIssuer() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "First invoice SAS");
        String apiKey = user.request().body(Map.of("name", "ERP", "environment", "SANDBOX"))
                .post("/console/api-keys")
                .then().statusCode(200).extract().path("secret");
        assertThat(apiKey).startsWith("cetus_sandbox_");

        JsonPath created = given().header("Authorization", "Bearer " + apiKey).contentType(ContentType.JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoice())
                .post("/v1/invoices")
                .then().statusCode(202).extract().jsonPath();

        assertThat(created.getString("environment")).isEqualTo("SANDBOX");
        assertThat(created.getString("status")).isEqualTo("RECEIVED");
        assertThat(created.getString("number")).isEqualTo("SIM1");
    }

    @Test
    void anAccountIssuesAFewSandboxDocumentsADay() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Busy sandbox SAS");
        String apiKey = user.request().body(Map.of("name", "ERP", "environment", "SANDBOX"))
                .post("/console/api-keys")
                .then().statusCode(200).extract().path("secret");

        // The test profile allows three a day.
        for (int i = 0; i < 3; i++) {
            issue(apiKey).then().statusCode(202);
        }
        issue(apiKey).then().statusCode(429)
                .body("code", equalTo("sandbox_daily_limit"))
                .header("Retry-After", notNullValue());
    }

    @Test
    void anAccountCanAddItsOwnSandboxIssuer() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Own data SAS");

        String issuerId = createIssuer(user, "900123456", "SANDBOX");

        JsonPath detail = user.request().get("/console/issuers/" + issuerId)
                .then().statusCode(200).extract().jsonPath();
        assertThat(detail.getString("status")).isEqualTo("ENABLED");
        assertThat(detail.getList("ranges.prefix")).containsExactlyInAnyOrder("SIM", "NCS", "NDS");
    }

    @Test
    void aSandboxIssuerNeedsNoSetup() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "No setup SAS");
        String issuerId = createIssuer(user, "900123456", "SANDBOX");
        String issuer = "/console/issuers/" + issuerId;

        user.request().body(Map.of("softwareId", SOFTWARE_ID, "pin", PIN))
                .put(issuer + "/software")
                .then().statusCode(422).body("code", equalTo("sandbox_issuer"));
        user.request().body(Map.of("pkcs12Base64", certificateBase64(), "password", CERTIFICATE_PASSWORD))
                .put(issuer + "/certificate")
                .then().statusCode(422).body("code", equalTo("sandbox_issuer"));
        user.request().body(Map.of("documentType", "INVOICE", "prefix", "OWN", "from", 1, "to", 10,
                        "resolutionNumber", "1", "resolutionDate", LocalDate.now().toString(),
                        "validFrom", LocalDate.now().toString(), "validTo", LocalDate.now().plusYears(1).toString()))
                .post(issuer + "/numbering-ranges")
                .then().statusCode(422).body("code", equalTo("sandbox_issuer"));
        user.request().post(issuer + "/promote")
                .then().statusCode(422).body("code", equalTo("sandbox_issuer"));
    }

    @Test
    void theSampleDoesNotCompeteWithTheIssuersOfOtherEnvironments() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Mixed SAS");
        ConsoleFixtures.onboard(user);
        String testKey = user.request().body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then().statusCode(200).extract().path("secret");

        // The TEST issuer is the only candidate of a TEST key, so it can be left out.
        given().header("Authorization", "Bearer " + testKey).contentType(ContentType.JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoice())
                .post("/v1/invoices")
                .then().statusCode(202).body("environment", equalTo("TEST"));
    }

    private static Response issue(String apiKey) {
        return given().header("Authorization", "Bearer " + apiKey).contentType(ContentType.JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoice())
                .post("/v1/invoices");
    }

    private static Map<String, Object> invoice() {
        return Map.of(
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
                        "taxes", List.of(Map.of("type", "IVA", "percent", 19)))));
    }
}
