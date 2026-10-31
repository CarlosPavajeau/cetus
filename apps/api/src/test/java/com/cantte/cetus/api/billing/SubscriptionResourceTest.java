package com.cantte.cetus.api.billing;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;

import com.cantte.cetus.api.admin.PlatformRoles;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.Subscriptions;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** The subscription as the console shows it, and what its owners and admins change of it. */
@QuarkusTest
class SubscriptionResourceTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);

    @Inject
    Subscriptions subscriptions;

    @Test
    void anAccountWithoutASubscriptionHasNone() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Sin Suscripción SAS");

        owner.request().get("/console/subscription").then().statusCode(404);
        owner.request()
                .body(Map.of("overageLimitCents", 0))
                .put("/console/subscription/overage-limit")
                .then()
                .statusCode(404);
        owner.request().get("/console/credits").then().body("subscription", nullValue());
    }

    @Test
    void everyMemberReadsThePeriodItsCreditsAndItsOverage() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(owner, "Suscrita SAS"));
        subscriptions.subscribe(accountId, "INICIAL", 150);

        owner.member("member")
                .request()
                .get("/console/subscription")
                .then()
                .statusCode(200)
                .body("status", equalTo("ACTIVE"))
                .body("planCode", equalTo("INICIAL"))
                .body("version.totalCents", equalTo(3_900_000))
                .body("overageLimitCents", equalTo(11_700_000))
                .body("overageLimit", equalTo(780))
                .body("cancelAtPeriodEnd", equalTo(false))
                .body("planNextName", nullValue())
                .body("payBy", nullValue())
                .body("period.number", equalTo(1))
                .body("period.documentsIncluded", equalTo(200))
                .body("period.documentsAvailable", equalTo(150))
                .body("period.overage", equalTo(0))
                .body("period.priceOverageCents", equalTo(15_000))
                .body("period.renewalOrderId", nullValue());
        owner.request()
                .get("/console/credits")
                .then()
                .body("product", equalTo(true))
                .body("productPackage", equalTo(false))
                .body("subscription", equalTo("Inicial"))
                .body("issuersIncluded", equalTo(1))
                .body("graceMargin", equalTo(0));
    }

    @Test
    void anOwnerChangesTheOverageLimitAndAMemberDoesNot() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(owner, "Límite SAS"));
        subscriptions.subscribe(accountId, "INICIAL", 200);

        owner.member("member")
                .request()
                .body(Map.of("overageLimitCents", 30_000_000))
                .put("/console/subscription/overage-limit")
                .then()
                .statusCode(403)
                .body("code", equalTo("organization_role_forbidden"));
        owner.impersonatedBy(ADMIN.userId())
                .body(Map.of("overageLimitCents", 30_000_000))
                .put("/console/subscription/overage-limit")
                .then()
                .statusCode(403)
                .body("code", equalTo("impersonation_forbidden"));
        owner.request()
                .body(Map.of("overageLimitCents", -1))
                .put("/console/subscription/overage-limit")
                .then()
                .statusCode(400);

        owner.request()
                .body(Map.of("overageLimitCents", 30_000_000))
                .put("/console/subscription/overage-limit")
                .then()
                .statusCode(200)
                .body("overageLimitCents", equalTo(30_000_000))
                .body("overageLimit", equalTo(2000));
        owner.request()
                .queryParam("action", "SUBSCRIPTION_OVERAGE_LIMIT_CHANGED")
                .get("/console/audit-log")
                .then()
                .body("items", hasSize(1))
                .body("items[0].data.overageLimitCents", equalTo(30_000_000))
                .body("items[0].data.overageLimitCentsPrevious", equalTo(11_700_000));
    }

    @Test
    void theNextPeriodTakesTheScheduledPlanUnlessTheSubscriptionEnds() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(owner, "Creciente SAS"));
        Subscriptions.Started started = subscriptions.subscribe(accountId, "INICIAL", 200);
        String crecimiento = versionOf(owner, "CRECIMIENTO");

        planNext(owner, versionOf(owner, "NEGOCIO"))
                .then()
                .statusCode(422)
                .body("code", equalTo("plan_version_not_offered"));
        planNext(owner, crecimiento)
                .then()
                .statusCode(200)
                .body("planCode", equalTo("INICIAL"))
                .body("planNextName", equalTo("Crecimiento"))
                .body("planVersionNextId", equalTo(crecimiento));
        planNext(owner, null).then().statusCode(200).body("planNextName", nullValue());
        planNext(owner, crecimiento).then().statusCode(200);

        owner.request()
                .post("/console/subscription/cancellation")
                .then()
                .statusCode(200)
                .body("cancelAtPeriodEnd", equalTo(true))
                .body("planNextName", nullValue());
        planNext(owner, crecimiento).then().statusCode(422).body("code", equalTo("subscription_ending"));
        owner.request()
                .delete("/console/subscription/cancellation")
                .then()
                .statusCode(200)
                .body("cancelAtPeriodEnd", equalTo(false));

        SubscriptionEntity subscription =
                QuarkusTransaction.requiringNew().call(() -> SubscriptionEntity.findById(started.subscriptionId()));
        assertThat(subscription.cancelAtPeriodEnd).isFalse();
        owner.request()
                .queryParam("action", "SUBSCRIPTION_CANCEL_SCHEDULED")
                .get("/console/audit-log")
                .then()
                .body("items", hasSize(1));
    }

    private static Response planNext(ConsoleUser owner, String planVersionId) {
        Map<String, Object> body = new HashMap<>();
        body.put("planVersionId", planVersionId);
        return owner.request().body(body).put("/console/subscription/plan-next");
    }

    private static String versionOf(ConsoleUser customer, String code) {
        return customer.request()
                .get("/console/plans")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getString("find { it.code == '%s' }.version.id".formatted(code));
    }
}
