package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.notNullValue;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ApiKeyResourceTest {

    @Test
    void createReturnsTheStoredCreationTime() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Keys SAS");

        JsonPath created = user.request()
                .body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        String createdAt = created.getString("key.createdAt");

        assertThat(createdAt).as("createdAt is required in the OpenAPI spec").isNotNull();
        JsonPath listed = user.request()
                .get("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertThat(listed.getString("find { it.id == '%s' }.createdAt".formatted(created.getString("key.id"))))
                .isEqualTo(createdAt);
    }

    @Test
    void detailListsTheRequestsMadeWithTheKey() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Usage SAS");
        JsonPath created = user.request()
                .body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        String keyId = created.getString("key.id");
        String missing = UUID.randomUUID().toString();

        String requestId = given().header("Authorization", "Bearer " + created.getString("secret"))
                .get("/v1/invoices/" + missing + "?customer=secret")
                .then()
                .statusCode(404)
                .extract()
                .header("X-Request-Id");

        JsonPath detail = user.request()
                .get("/console/api-keys/" + keyId)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertThat(detail.getString("key.createdBy")).isEqualTo(user.userId());
        assertThat(detail.getLong("requestsLast24Hours")).isEqualTo(1);
        List<Map<String, Object>> requests = detail.getList("recentRequests");
        assertThat(requests)
                .singleElement()
                .satisfies(request -> assertThat(request)
                        .containsEntry("id", requestId)
                        .containsEntry("method", "GET")
                        .as("no query string")
                        .containsEntry("path", "/v1/invoices/" + missing)
                        .containsEntry("status", 404));
    }

    @Test
    void detailOfAnotherAccountsKeyIsNotFound() {
        ConsoleUser alice = ConsoleUser.newOrganization();
        ConsoleUser bob = ConsoleUser.newOrganization();
        bootstrap(alice, "Alice SAS");
        bootstrap(bob, "Bob SAS");
        String bobKey = bob.request()
                .body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("key.id");

        alice.request().get("/console/api-keys/" + bobKey).then().statusCode(404);
    }

    @Test
    void rejectedRequestsStillGetARequestId() {
        given().header("Authorization", "Bearer cetus_test_unknown")
                .get("/v1/invoices/" + UUID.randomUUID())
                .then()
                .statusCode(401)
                .header("X-Request-Id", notNullValue());
    }
}
