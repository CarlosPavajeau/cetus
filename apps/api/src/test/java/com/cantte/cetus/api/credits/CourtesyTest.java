package com.cantte.cetus.api.credits;

import static com.cantte.cetus.api.support.Concurrency.race;
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
import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.credits.Entitlements;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.PromotionClaimEntity;
import com.cantte.cetus.persistence.entity.PromotionEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;

/** The first accounts that go to production without a product get the courtesy lot, once per NIT. */
@QuarkusTest
class CourtesyTest {

    @Inject
    Entitlements entitlements;

    @Inject
    Credits credits;

    @Inject
    CreditLedger ledger;

    @Test
    void promotingTheFirstTestIssuerGetsTheCourtesyLot() {
        slotsRemaining(1);
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Cortesía SAS"));

        goLive(user, nit());

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
        goLive(user, nit());

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
    void aProductionIssuerCreatedDirectlyGetsNoCourtesy() {
        slotsRemaining(1);
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Directa SAS"));

        user.request()
                .body(issuerRequest(nit(), "LIVE"))
                .post("/console/issuers")
                .then()
                .statusCode(402)
                .body("code", equalTo("no_active_product"));
        assertThat(claims(accountId)).isZero();
    }

    @Test
    void aNitGetsTheCourtesyOnce() {
        slotsRemaining(2);
        String nit = nit();
        ConsoleUser first = ConsoleUser.newOrganization();
        bootstrap(first, "Primera SAS");
        goLive(first, nit);
        ConsoleUser second = ConsoleUser.newOrganization();
        UUID secondId = UUID.fromString(bootstrap(second, "Segunda SAS"));

        promote(second, nit).then().statusCode(402).body("code", equalTo("no_active_product"));
        assertThat(claims(secondId)).isZero();
    }

    @Test
    void withoutSlotsLeftThereIsNoCourtesy() {
        slotsRemaining(1);
        ConsoleUser taker = ConsoleUser.newOrganization();
        bootstrap(taker, "Última SAS");
        goLive(taker, nit());
        ConsoleUser late = ConsoleUser.newOrganization();
        UUID lateId = UUID.fromString(bootstrap(late, "Tardía SAS"));

        given().get("/console/public/landing").then().statusCode(200).body("courtesy.slotsRemaining", equalTo(0));
        late.request().get("/console/credits").then().statusCode(200).body("courtesy", nullValue());
        promote(late, nit()).then().statusCode(402).body("code", equalTo("no_active_product"));
        assertThat(claims(lateId)).isZero();
    }

    @Test
    void anAccountThatHadAProductGetsNoCourtesy() {
        slotsRemaining(1);
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Vencida SAS"));
        credits.grant(accountId, "EMPRENDEDOR", 300, OffsetDateTime.now().minusMinutes(1));

        user.request().get("/console/credits").then().statusCode(200).body("courtesy", nullValue());
        promote(user, nit()).then().statusCode(402).body("code", equalTo("no_active_product"));
        assertThat(claims(accountId)).isZero();
    }

    @Test
    void anAdjustmentIsNoProduct() {
        slotsRemaining(1);
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Ajustada SAS"));
        QuarkusTransaction.requiringNew()
                .run(() -> ledger.grant(
                                accountId,
                                new CreditLedger.Source(CreditGrantEntity.SourceType.ADJUSTMENT, Ids.newId()),
                                null,
                                5,
                                OffsetDateTime.now().plusMonths(1),
                                Actor.system(),
                                "Ajuste de las pruebas")
                        .orElseThrow());

        user.request().get("/console/credits").then().statusCode(200).body("courtesy.status", equalTo("OFFERED"));
        goLive(user, nit());
        assertThat(claims(accountId)).isEqualTo(1);
    }

    @Test
    void leadingZerosNameTheSameNit() {
        slotsRemaining(2);
        String nit = nit();
        ConsoleUser first = ConsoleUser.newOrganization();
        bootstrap(first, "Sin Ceros SAS");
        goLive(first, nit);
        ConsoleUser second = ConsoleUser.newOrganization();
        UUID secondId = UUID.fromString(bootstrap(second, "Con Ceros SAS"));

        promote(second, "0" + nit).then().statusCode(402).body("code", equalTo("no_active_product"));
        assertThat(claims(secondId)).isZero();
    }

    @Test
    void accountsRacingForTheLastSlotGetItOnce() throws Exception {
        slotsRemaining(1);
        ConsoleUser first = ConsoleUser.newOrganization();
        bootstrap(first, "Carrera Uno SAS");
        ConsoleUser second = ConsoleUser.newOrganization();
        bootstrap(second, "Carrera Dos SAS");
        String firstTestId = onboard(first, nit()).issuerId();
        String secondTestId = onboard(second, nit()).issuerId();
        List<Callable<Response>> racers = List.of(
                () -> first.request().post("/console/issuers/" + firstTestId + "/promote"),
                () -> second.request().post("/console/issuers/" + secondTestId + "/promote"));

        List<Response> responses = race(racers);

        assertThat(responses).extracting(Response::statusCode).containsExactlyInAnyOrder(200, 402);
        assertThat(responses)
                .filteredOn(response -> response.statusCode() == 402)
                .extracting(response -> response.jsonPath().getString("code"))
                .containsOnly("no_active_product");
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

    /** Promotes a new test issuer in habilitación of the NIT, as the console's "Pasar a producción" does. */
    private static Response promote(ConsoleUser user, String nit) {
        String testId = onboard(user, nit).issuerId();
        return user.request().post("/console/issuers/" + testId + "/promote");
    }

    private static void goLive(ConsoleUser user, String nit) {
        promote(user, nit).then().statusCode(200);
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
