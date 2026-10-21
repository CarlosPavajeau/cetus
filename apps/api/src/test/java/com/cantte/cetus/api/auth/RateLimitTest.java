package com.cantte.cetus.api.auth;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.restassured.response.ValidatableResponse;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

/** A tiny limit (2 requests, almost no refill), so the third request of a key is always over it. */
@QuarkusTest
@TestProfile(RateLimitTest.TinyLimit.class)
class RateLimitTest {

    public static class TinyLimit implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("cetus.rate-limit.burst", "2", "cetus.rate-limit.requests-per-second", "0.01");
        }
    }

    @Test
    void aKeyOverItsLimitGets429AndOtherKeysAreNotAffected() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Rate Limited SAS");
        String busy = testKey(user);
        String other = testKey(user);

        call(busy).statusCode(404);
        call(busy).statusCode(404);
        call(busy).statusCode(429)
                .header("Retry-After", notNullValue())
                .contentType("application/problem+json")
                .body("status", equalTo(429))
                .body("title", equalTo("Too Many Requests"))
                .body("code", equalTo("rate_limited"));

        call(other).statusCode(404);
    }

    private static ValidatableResponse call(String apiKey) {
        return given().header("Authorization", "Bearer " + apiKey)
                .get("/v1/invoices/" + UUID.randomUUID())
                .then();
    }

    private static String testKey(ConsoleUser user) {
        return user.request().body(Map.of("name", "ERP " + UUID.randomUUID(), "environment", "TEST"))
                .post("/console/api-keys")
                .then().statusCode(200).extract().path("secret");
    }
}
