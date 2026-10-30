package com.cantte.cetus.api.auth;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.cache.LocalRateLimiter;
import com.cantte.cetus.cache.RateLimiter;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** An account's own production limits, shared by its keys; a tiny one makes the third request go over it. */
@QuarkusTest
class AccountRateLimitTest {

    @Inject
    AccessCache access;

    /** A clock that never moves, so no token comes back however slow the requests are. */
    @BeforeEach
    void freezeTheClock() {
        long now = System.nanoTime();
        QuarkusMock.installMockForType(
                new ApiKeyRateLimiter(
                        new RateLimiter.Limits(10, 20), new RateLimiter.Limits(5, 10), new LocalRateLimiter(() -> now)),
                ApiKeyRateLimiter.class);
    }

    @Test
    void theProductionKeysOfAnAccountShareItsOwnLimits() {
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Limitada SAS"));
        QuarkusTransaction.requiringNew().run(() -> {
            AccountEntity account = AccountEntity.findById(accountId);
            account.planId = PlanEntity.byCode("ESCALA").id;
            account.requestsPerSecond = 1;
            account.requestsBurst = 2;
            access.changed(account);
        });
        String first = key(user, "LIVE");
        String second = key(user, "LIVE");
        String test = key(user, "TEST");

        call(first).statusCode(404);
        call(second).statusCode(404);
        call(first).statusCode(429).body("code", equalTo("rate_limited"));
        call(second).statusCode(429);
        call(test).statusCode(404);

        user.request()
                .get("/console/usage")
                .then()
                .body("requests.requestsPerSecond", equalTo(1f))
                .body("requests.requestsBurst", equalTo(2))
                .body("requests.perKey", equalTo(false))
                .body("current.plan.requestsPerSecond", equalTo(20))
                .body("current.plan.requestsBurst", equalTo(60));
    }

    private static ValidatableResponse call(String apiKey) {
        return given().header("Authorization", "Bearer " + apiKey)
                .get("/v1/invoices/" + UUID.randomUUID())
                .then();
    }

    private static String key(ConsoleUser user, String environment) {
        return user.request()
                .body(Map.of("name", "ERP " + UUID.randomUUID(), "environment", environment))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("secret");
    }
}
