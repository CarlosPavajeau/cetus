package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static com.cantte.cetus.api.support.ConsoleFixtures.issuerRequest;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.persistence.entity.AccountEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
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

/** The production issuers an account may have are the ones its plan includes. */
@QuarkusTest
class PlanIssuerLimitTest {

    @Test
    void aPlanTakesOnlyItsProductionIssuers() {
        ConsoleUser user = ConsoleUser.newOrganization();
        assignPlan(bootstrap(user, "Inicial SAS"), "INICIAL");
        createIssuer(user, "900111222", "LIVE");

        user.request()
                .body(issuerRequest("900333444", "LIVE"))
                .post("/console/issuers")
                .then()
                .statusCode(422)
                .body("code", equalTo("plan_issuer_limit"));
        String testId = onboard(user, "900333444").issuerId();
        user.request()
                .post("/console/issuers/" + testId + "/promote")
                .then()
                .statusCode(422)
                .body("code", equalTo("plan_issuer_limit"));

        assignPlan(user, "CRECIMIENTO");
        user.request().post("/console/issuers/" + testId + "/promote").then().statusCode(200);
    }

    @Test
    void requestsRacingForTheLastSlotGetItOnlyOnce() throws Exception {
        ConsoleUser user = ConsoleUser.newOrganization();
        assignPlan(bootstrap(user, "Carrera SAS"), "INICIAL");
        String testId = onboard(user, "900333444").issuerId();
        List<Callable<Response>> racers = List.of(
                () -> user.request().body(issuerRequest("900444555", "LIVE")).post("/console/issuers"),
                () -> user.request().body(issuerRequest("900666777", "LIVE")).post("/console/issuers"),
                () -> user.request().post("/console/issuers/" + testId + "/promote"));

        List<Response> responses = race(racers);

        assertThat(responses).extracting(Response::statusCode).containsExactlyInAnyOrder(200, 422, 422);
        assertThat(responses)
                .filteredOn(response -> response.statusCode() == 422)
                .extracting(response -> response.jsonPath().getString("code"))
                .containsOnly("plan_issuer_limit");
    }

    @Test
    void requestsRacingForTheSameNitCreateItOnce() throws Exception {
        ConsoleUser user = ConsoleUser.newOrganization();
        assignPlan(bootstrap(user, "Duplicada SAS"), "CRECIMIENTO");
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

    @Test
    void aPlanWithoutALimitTakesAnyNumber() {
        ConsoleUser user = ConsoleUser.newOrganization();
        assignPlan(bootstrap(user, "Socios SAS"), "SOCIOS");

        createIssuer(user, "900111222", "LIVE");
        createIssuer(user, "900333444", "LIVE");
    }

    private static void assignPlan(String accountId, String plan) {
        QuarkusTransaction.requiringNew()
                .run(() -> AccountEntity.<AccountEntity>findById(UUID.fromString(accountId)).plan = plan);
    }

    private static void assignPlan(ConsoleUser user, String plan) {
        QuarkusTransaction.requiringNew()
                .run(() ->
                        AccountEntity.findByOrganization(user.organizationId()).orElseThrow().plan = plan);
    }
}
