package com.cantte.cetus.api.auth;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.startsWith;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.persistence.entity.AccountEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.ValidatableResponse;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ApiKeyFilterTest {

    @Test
    void unknownKeysAreUnauthorized() {
        given().header("Authorization", "Bearer cetus_test_unknown")
                .get("/v1/invoices/" + UUID.randomUUID())
                .then()
                .statusCode(401)
                .contentType("application/problem+json")
                .body("type", equalTo("about:blank"))
                .body("title", equalTo("Unauthorized"))
                .body("status", equalTo(401))
                .body("instance", startsWith("/v1/invoices/"))
                .body("code", equalTo("unauthorized"));
    }

    @Test
    void suspendedAccountsCannotUseTheirKeys() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Suspended SAS");
        String apiKey = testKey(user);
        call(apiKey).statusCode(404);

        setStatus(user, "SUSPENDED");
        call(apiKey).statusCode(403).body("code", equalTo("account_suspended"));

        setStatus(user, "ACTIVE");
        call(apiKey).statusCode(404);
    }

    @Test
    void closedAccountsCannotUseTheirKeys() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Closed SAS");
        String apiKey = testKey(user);

        setStatus(user, "CLOSED");
        call(apiKey).statusCode(403).body("code", equalTo("account_suspended"));
    }

    private static ValidatableResponse call(String apiKey) {
        return given().header("Authorization", "Bearer " + apiKey)
                .get("/v1/invoices/" + UUID.randomUUID())
                .then();
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

    private static void setStatus(ConsoleUser user, String status) {
        QuarkusTransaction.requiringNew()
                .run(() ->
                        AccountEntity.findByOrganization(user.organizationId()).orElseThrow().status = status);
    }
}
