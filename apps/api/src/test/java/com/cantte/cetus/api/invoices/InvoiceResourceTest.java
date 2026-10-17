package com.cantte.cetus.api.invoices;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

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

    private static RequestSpecification api(String apiKey) {
        return given().header("Authorization", "Bearer " + apiKey).contentType(ContentType.JSON);
    }

    private static Map<String, Object> invoice(String issuerId) {
        return Map.of(
                "issuerId", issuerId,
                "customer", Map.of(
                        "personType", "NATURAL_PERSON",
                        "identificationType", "CITIZEN_ID",
                        "identificationNumber", "1020304050",
                        "legalName", "Consumidor Final"),
                "payment", Map.of("method", "CASH", "meansCode", "10"),
                "lines", List.of(Map.of(
                        "description", "Servicio",
                        "quantity", 1,
                        "unitPrice", 100000,
                        "taxes", List.of(Map.of("type", "IVA", "percent", 19)))));
    }
}
