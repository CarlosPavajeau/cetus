package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.CERTIFICATE_PASSWORD;
import static com.cantte.cetus.api.support.ConsoleFixtures.PIN;
import static com.cantte.cetus.api.support.ConsoleFixtures.SOFTWARE_ID;
import static com.cantte.cetus.api.support.ConsoleFixtures.addRange;
import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.certificateBase64;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static com.cantte.cetus.api.support.ConsoleFixtures.habilitated;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static com.cantte.cetus.api.support.ConsoleFixtures.rangeRequest;
import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.api.support.ConsoleFixtures.Onboarding;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.Credits;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity.VerificationStatus;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** What an issuer lacks to issue today, which the console follows instead of working it out. */
@QuarkusTest
class IssuerReadinessTest {

    @Test
    void aNewIssuerLacksEveryPieceOfItsSetup() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Readiness SAS");
        String issuerId = createIssuer(user);

        JsonPath issuer = detail(user, issuerId);

        assertThat(issuer.getBoolean("canIssue")).isFalse();
        assertThat(issuer.getBoolean("readiness.ready")).isFalse();
        assertThat(issuer.getList("readiness.missing", String.class))
                .containsExactly("SOFTWARE_MISSING", "CERTIFICATE_MISSING", "INVOICE_RANGE_MISSING");
    }

    @Test
    void anExpiredResolutionLeavesTheIssuerInItsStatusButWithoutARange() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Vencida SAS");
        Onboarding onboarding = onboard(user);
        assertThat(detail(user, onboarding.issuerId()).getBoolean("readiness.ready"))
                .isTrue();

        QuarkusTransaction.requiringNew()
                .run(() -> NumberingRangeEntity.<NumberingRangeEntity>findById(UUID.fromString(onboarding.rangeId()))
                                .validTo =
                        LocalDate.now(DianTime.ZONE).minusDays(1));

        JsonPath issuer = detail(user, onboarding.issuerId());
        assertThat(issuer.getString("status")).isEqualTo("TESTING");
        assertThat(issuer.getBoolean("canIssue")).isTrue();
        assertThat(issuer.getList("readiness.missing", String.class)).containsExactly("INVOICE_RANGE_MISSING");
        assertThat(issuer.getString("ranges[0].status")).isEqualTo("EXPIRED");
    }

    @Test
    void aResolutionThatStartsLaterFinishesTheSetupButNumbersNothingYet() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Futura SAS");
        String issuerId = createIssuer(user);
        user.request()
                .body(Map.of("softwareId", SOFTWARE_ID, "pin", PIN))
                .put("/console/issuers/" + issuerId + "/software")
                .then()
                .statusCode(200);
        user.request()
                .body(Map.of("pkcs12Base64", certificateBase64(), "password", CERTIFICATE_PASSWORD))
                .put("/console/issuers/" + issuerId + "/certificate")
                .then()
                .statusCode(200);
        Map<String, Object> range = rangeRequest("SETP");
        range.put("validFrom", LocalDate.now(DianTime.ZONE).plusDays(1).toString());
        user.request()
                .body(range)
                .post("/console/issuers/" + issuerId + "/numbering-ranges")
                .then()
                .statusCode(200);

        JsonPath issuer = detail(user, issuerId);
        assertThat(issuer.getString("status")).isEqualTo("TESTING");
        assertThat(issuer.getList("readiness.missing", String.class)).containsExactly("INVOICE_RANGE_MISSING");
    }

    @Test
    void aProductionIssuerWaitsForTheDianToConfirmTheRangeItNumbersFrom() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Confirmada SAS");
        String testId = habilitated(user).issuerId();
        Credits.ensurePackage(user);
        String liveId = user.request()
                .post("/console/issuers/" + testId + "/promote")
                .then()
                .statusCode(200)
                .extract()
                .path("id");
        String rangeId = addRange(user, liveId, "FE");

        assertThat(detail(user, liveId).getList("readiness.missing", String.class))
                .containsExactly("INVOICE_RANGE_UNVERIFIED");

        QuarkusTransaction.requiringNew()
                .run(() -> NumberingRangeEntity.<NumberingRangeEntity>findById(UUID.fromString(rangeId))
                                .verificationStatus =
                        VerificationStatus.VERIFIED);
        assertThat(detail(user, liveId).getBoolean("readiness.ready")).isTrue();
    }

    private static JsonPath detail(ConsoleUser user, String issuerId) {
        return user.request()
                .get("/console/issuers/" + issuerId)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
    }
}
