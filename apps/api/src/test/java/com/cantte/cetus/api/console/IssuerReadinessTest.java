package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.api.support.ConsoleFixtures.Onboarding;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import java.time.LocalDate;
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

    private static JsonPath detail(ConsoleUser user, String issuerId) {
        return user.request()
                .get("/console/issuers/" + issuerId)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
    }
}
