package com.cantte.cetus.api.issuers;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import io.restassured.specification.RequestSpecification;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class PublicIssuerResourceTest {

    @Test
    void listsTheIssuersOfTheKeysAccountAndEnvironment() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Discovery SAS");
        String ready = ConsoleFixtures.onboard(user).issuerId();
        String pending = ConsoleFixtures.createIssuer(user, "800197268");
        // Another organization's issuer is never listed.
        ConsoleUser other = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(other, "Other SAS");
        String foreign = ConsoleFixtures.createIssuer(other);

        JsonPath test = api(key(user, "TEST"))
                .get("/v1/issuers")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertThat(test.getList("id", String.class)).containsExactlyInAnyOrder(ready, pending);
        assertThat(test.getBoolean("find { it.id == '" + ready + "' }.readyToIssue"))
                .isTrue();
        assertThat(test.getString("find { it.id == '" + ready + "' }.status")).isEqualTo("TESTING");
        assertThat(test.getBoolean("find { it.id == '" + pending + "' }.readyToIssue"))
                .isFalse();

        // A production key sees only production issuers.
        JsonPath live = api(key(user, "LIVE"))
                .get("/v1/issuers")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertThat(live.getList("id")).isEmpty();

        api(key(user, "TEST")).get("/v1/issuers/" + ready).then().statusCode(200);
        api(key(user, "LIVE")).get("/v1/issuers/" + ready).then().statusCode(404);
        api(key(user, "TEST")).get("/v1/issuers/" + foreign).then().statusCode(404);
        api(key(user, "TEST")).get("/v1/issuers/" + UUID.randomUUID()).then().statusCode(404);
    }

    @Test
    void needsAnApiKey() {
        given().get("/v1/issuers").then().statusCode(401);
    }

    private static String key(ConsoleUser user, String environment) {
        return user.request()
                .body(Map.of("name", "ERP " + environment, "environment", environment))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("secret");
    }

    private static RequestSpecification api(String apiKey) {
        return given().header("Authorization", "Bearer " + apiKey);
    }
}
