package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.SOFTWARE_ID;
import static com.cantte.cetus.api.support.ConsoleFixtures.addRange;
import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import org.junit.jupiter.api.Test;

/** Promoting a test issuer that finished habilitación to its production issuer. */
@QuarkusTest
class IssuerPromotionTest {

    @Test
    void promotionStartsTheProductionIssuerWithTheSoftwareAndCertificate() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Promotion SAS");
        String testId = onboard(user).issuerId();

        JsonPath live = promote(user, testId).then().statusCode(200).extract().jsonPath();
        assertThat(live.getString("id")).isNotEqualTo(testId);
        assertThat(live.getString("environment")).isEqualTo("LIVE");
        assertThat(live.getString("nit")).isEqualTo("900123456");
        assertThat(live.getString("status")).isEqualTo("ONBOARDING");

        JsonPath detail = user.request()
                .get("/console/issuers/" + live.getString("id"))
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertThat(detail.getString("legalName")).isEqualTo("Acme SAS");
        assertThat(detail.getString("software.softwareId")).isEqualTo(SOFTWARE_ID);
        assertThat(detail.getString("software.testSetId")).isNull();
        assertThat(detail.getString("certificate.subject")).isEqualTo("CN=Cetus Test Signer,O=Cantte,C=CO");
        assertThat(detail.getList("ranges"))
                .as("the production numbering is the person's own")
                .isEmpty();

        // The production numbering completes it: the copied software and certificate are usable.
        addRange(user, live.getString("id"), "FE");
        user.request()
                .get("/console/issuers/" + live.getString("id"))
                .then()
                .statusCode(200)
                .body("status", equalTo("ENABLED"));

        // The test issuer keeps working in habilitación.
        user.request().get("/console/issuers/" + testId).then().statusCode(200).body("status", equalTo("TESTING"));

        assertThat(AuditTrailTest.entries(user, "ISSUER_PROMOTED"))
                .singleElement()
                .satisfies(entry -> assertThat(entry).containsEntry("resourceId", testId));
    }

    @Test
    void aNitIsPromotedOnlyOnce() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Twice SAS");
        String testId = onboard(user).issuerId();
        promote(user, testId).then().statusCode(200);

        promote(user, testId).then().statusCode(422).body("code", equalTo("issuer_already_promoted"));
    }

    @Test
    void onlyATestIssuerInHabilitacionCanBePromoted() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Early SAS");
        String pending = createIssuer(user);

        promote(user, pending).then().statusCode(422).body("code", equalTo("issuer_not_promotable"));
    }

    @Test
    void anIssuerOfAnotherOrganizationIsNotFound() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Owner SAS");
        String testId = onboard(owner).issuerId();
        ConsoleUser other = ConsoleUser.newOrganization();
        bootstrap(other, "Other SAS");

        promote(other, testId).then().statusCode(404);
    }

    private static io.restassured.response.Response promote(ConsoleUser user, String issuerId) {
        return user.request().post("/console/issuers/" + issuerId + "/promote");
    }
}
