package com.cantte.cetus.api.credits;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.issuerRequest;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.Credits;
import com.cantte.cetus.credits.Entitlements;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.PromotionClaimEntity;
import com.cantte.cetus.persistence.entity.PromotionEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;

/** The first accounts that go to production without a product get the courtesy lot, once per NIT. */
@QuarkusTest
class CourtesyTest {

    @Inject
    Entitlements entitlements;

    @Inject
    Credits credits;

    @Test
    void theFirstProductionIssuerGetsTheCourtesyLot() {
        slotsRemaining(1);
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Cortesía SAS"));

        user.request()
                .body(issuerRequest(nit(), "LIVE"))
                .post("/console/issuers")
                .then()
                .statusCode(200);

        List<CreditGrantEntity> lots =
                QuarkusTransaction.requiringNew().call(() -> CreditGrantEntity.listByAccount(accountId));
        assertThat(lots).singleElement().satisfies(lot -> {
            assertThat(lot.quantity).isEqualTo(50);
            assertThat(lot.planVersionId).isEqualTo(courtesyVersionId());
            assertThat(lot.expiresAt).isCloseTo(OffsetDateTime.now().plusDays(90), within(1, ChronoUnit.MINUTES));
        });
        Entitlements.Entitlement entitlement =
                QuarkusTransaction.requiringNew().call(() -> entitlements.of(accountId, OffsetDateTime.now()));
        assertThat(entitlement.productPackage()).isTrue();
        assertThat(entitlement.issuersIncluded()).isEqualTo(1);
        assertThat(entitlement.graceMargin()).isZero();
        List<NotificationEntity> notices = QuarkusTransaction.requiringNew()
                .call(() -> NotificationEntity.<NotificationEntity>list(
                        "accountId = ?1 and kind = ?2", accountId, "COURTESY_GRANTED"));
        assertThat(notices)
                .singleElement()
                .satisfies(notice ->
                        assertThat(notice.data).containsEntry("documents", "50").containsKey("expiresAt"));
        user.request()
                .get("/console/credits")
                .then()
                .statusCode(200)
                .body("courtesy.status", equalTo("GRANTED"))
                .body("courtesy.documents", equalTo(50))
                .body("courtesy.remaining", equalTo(50));
    }

    @Test
    void anotherProductHidesTheCourtesy() {
        slotsRemaining(1);
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Compradora SAS"));
        user.request()
                .body(issuerRequest(nit(), "LIVE"))
                .post("/console/issuers")
                .then()
                .statusCode(200);

        credits.grant(accountId, "EMPRENDEDOR", 300, OffsetDateTime.now().plusMonths(12));

        user.request().get("/console/credits").then().statusCode(200).body("courtesy", nullValue());
    }

    @Test
    void aNewAccountSeesTheCourtesyOffered() {
        slotsRemaining(1);
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Nueva SAS");

        user.request()
                .get("/console/credits")
                .then()
                .statusCode(200)
                .body("courtesy.status", equalTo("OFFERED"))
                .body("courtesy.documents", equalTo(50))
                .body("courtesy.validityDays", equalTo(90));
    }

    @Test
    void promotingTheTestIssuerGetsTheCourtesyLot() {
        slotsRemaining(1);
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Habilitada SAS"));
        String testId = onboard(user, nit()).issuerId();

        user.request().post("/console/issuers/" + testId + "/promote").then().statusCode(200);

        assertThat(claims(accountId)).isEqualTo(1);
    }

    @Test
    void aNitGetsTheCourtesyOnce() {
        slotsRemaining(2);
        String nit = nit();
        ConsoleUser first = ConsoleUser.newOrganization();
        bootstrap(first, "Primera SAS");
        first.request()
                .body(issuerRequest(nit, "LIVE"))
                .post("/console/issuers")
                .then()
                .statusCode(200);
        ConsoleUser second = ConsoleUser.newOrganization();
        UUID secondId = UUID.fromString(bootstrap(second, "Segunda SAS"));

        second.request()
                .body(issuerRequest(nit, "LIVE"))
                .post("/console/issuers")
                .then()
                .statusCode(402)
                .body("code", equalTo("no_active_product"));
        assertThat(claims(secondId)).isZero();
    }

    @Test
    void withoutSlotsLeftThereIsNoCourtesy() {
        slotsRemaining(1);
        ConsoleUser taker = ConsoleUser.newOrganization();
        bootstrap(taker, "Última SAS");
        taker.request()
                .body(issuerRequest(nit(), "LIVE"))
                .post("/console/issuers")
                .then()
                .statusCode(200);
        ConsoleUser late = ConsoleUser.newOrganization();
        UUID lateId = UUID.fromString(bootstrap(late, "Tardía SAS"));

        given().get("/console/public/landing").then().statusCode(200).body("courtesy.slotsRemaining", equalTo(0));
        late.request().get("/console/credits").then().statusCode(200).body("courtesy", nullValue());
        late.request()
                .body(issuerRequest(nit(), "LIVE"))
                .post("/console/issuers")
                .then()
                .statusCode(402)
                .body("code", equalTo("no_active_product"));
        assertThat(claims(lateId)).isZero();
    }

    @Test
    void theLandingShowsTheSlotsLeft() {
        slotsRemaining(7);

        given().get("/console/public/landing")
                .then()
                .statusCode(200)
                .body("courtesy.slotsRemaining", equalTo(7))
                .body("courtesy.documents", equalTo(50))
                .body("courtesy.validityDays", equalTo(90));
    }

    /** Sets the active promotion's slots so that exactly this many remain. */
    private static void slotsRemaining(int count) {
        QuarkusTransaction.requiringNew().run(() -> {
            PromotionEntity promotion = PromotionEntity.lockActive().orElseThrow();
            promotion.slots = (int) PromotionClaimEntity.countByPromotion(promotion.id) + count;
        });
    }

    private static long claims(UUID accountId) {
        return QuarkusTransaction.requiringNew().call(() -> PromotionClaimEntity.count("accountId", accountId));
    }

    private static UUID courtesyVersionId() {
        return QuarkusTransaction.requiringNew()
                .call(() -> PlanVersionEntity.<PlanVersionEntity>find("planId", PlanEntity.byCode("CORTESIA").id)
                        .singleResult()
                        .id);
    }

    private static String nit() {
        return String.valueOf(ThreadLocalRandom.current().nextLong(800_000_000L, 900_000_000L));
    }
}
