package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static com.cantte.cetus.api.support.ConsoleFixtures.issuerRequest;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.persistence.entity.AccountEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import java.util.UUID;
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
    void anAccountWithoutAPlanHasNoLimit() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Libre SAS");

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
