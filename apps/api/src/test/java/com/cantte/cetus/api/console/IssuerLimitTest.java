package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static com.cantte.cetus.api.support.ConsoleFixtures.issuerRequest;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.Credits;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

/** The production issuers an account may have need a product, and are the most its package lots include. */
@QuarkusTest
class IssuerLimitTest {

    @Inject
    Credits credits;

    @Test
    void aPackageTakesOnlyItsProductionIssuers() {
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Emprendedora SAS"));
        credits.grant(accountId, "EMPRENDEDOR", 300, OffsetDateTime.now().plusMonths(12));
        createIssuer(user, "900111222", "LIVE");

        user.request()
                .body(issuerRequest("900333444", "LIVE"))
                .post("/console/issuers")
                .then()
                .statusCode(402)
                .body("code", equalTo("issuer_limit_reached"));
        String testId = onboard(user, "900333444").issuerId();
        user.request()
                .post("/console/issuers/" + testId + "/promote")
                .then()
                .statusCode(402)
                .body("code", equalTo("issuer_limit_reached"));

        credits.grant(accountId, "CONTADOR", 3000, OffsetDateTime.now().plusMonths(12));
        user.request().post("/console/issuers/" + testId + "/promote").then().statusCode(200);
    }

    @Test
    void withoutAProductThereAreNoProductionIssuers() {
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Sin Paquete SAS"));
        credits.grant(accountId, "CONTADOR", 3000, OffsetDateTime.now().minusMinutes(1));
        String testId = onboard(user, "900333444").issuerId();

        user.request()
                .body(issuerRequest("900111222", "LIVE"))
                .post("/console/issuers")
                .then()
                .statusCode(402)
                .body("code", equalTo("no_active_product"));
        user.request()
                .post("/console/issuers/" + testId + "/promote")
                .then()
                .statusCode(402)
                .body("code", equalTo("no_active_product"));
    }

    @Test
    void aTopUpAddsNoIssuers() {
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Recargada SAS"));
        credits.grant(accountId, "EMPRENDEDOR", 300, OffsetDateTime.now().plusMonths(12));
        credits.grant(accountId, "RECARGA_1000", 1000, OffsetDateTime.now().plusMonths(12));
        createIssuer(user, "900111222", "LIVE");

        user.request()
                .body(issuerRequest("900333444", "LIVE"))
                .post("/console/issuers")
                .then()
                .statusCode(402)
                .body("code", equalTo("issuer_limit_reached"));
    }

    @Test
    void requestsRacingForTheLastSlotGetItOnlyOnce() throws Exception {
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Carrera SAS"));
        credits.grant(accountId, "EMPRENDEDOR", 300, OffsetDateTime.now().plusMonths(12));
        String testId = onboard(user, "900333444").issuerId();
        List<Callable<Response>> racers = List.of(
                () -> user.request().body(issuerRequest("900444555", "LIVE")).post("/console/issuers"),
                () -> user.request().body(issuerRequest("900666777", "LIVE")).post("/console/issuers"),
                () -> user.request().post("/console/issuers/" + testId + "/promote"));

        List<Response> responses = race(racers);

        assertThat(responses).extracting(Response::statusCode).containsExactlyInAnyOrder(200, 402, 402);
        assertThat(responses)
                .filteredOn(response -> response.statusCode() == 402)
                .extracting(response -> response.jsonPath().getString("code"))
                .containsOnly("issuer_limit_reached");
    }

    @Test
    void requestsRacingForTheSameNitCreateItOnce() throws Exception {
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Duplicada SAS"));
        credits.grant(accountId, "CONTADOR", 3000, OffsetDateTime.now().plusMonths(12));
        Callable<Response> create =
                () -> user.request().body(issuerRequest("900444555", "LIVE")).post("/console/issuers");

        List<Response> responses = race(List.of(create, create));

        assertThat(responses).extracting(Response::statusCode).containsExactlyInAnyOrder(200, 422);
        assertThat(responses)
                .filteredOn(response -> response.statusCode() == 422)
                .extracting(response -> response.jsonPath().getString("code"))
                .containsOnly("issuer_already_exists");
    }

    /** Runs the requests at once, on threads that see the test's classes as RestAssured needs. */
    private static List<Response> race(List<Callable<Response>> racers) throws Exception {
        ClassLoader classes = Thread.currentThread().getContextClassLoader();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(racers.size(), task -> {
            Thread thread = new Thread(task);
            thread.setContextClassLoader(classes);
            return thread;
        });
        try {
            List<Future<Response>> futures = new ArrayList<>();
            for (Callable<Response> racer : racers) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return racer.call();
                }));
            }
            start.countDown();
            List<Response> responses = new ArrayList<>();
            for (Future<Response> future : futures) {
                responses.add(future.get(30, TimeUnit.SECONDS));
            }
            return responses;
        } finally {
            pool.shutdownNow();
        }
    }
}
