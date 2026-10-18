package com.cantte.cetus.api.console;

import com.cantte.cetus.api.support.ConsoleFixtures.Onboarding;
import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static com.cantte.cetus.api.support.ConsoleFixtures.CERTIFICATE_PASSWORD;
import static com.cantte.cetus.api.support.ConsoleFixtures.PIN;
import static com.cantte.cetus.api.support.ConsoleFixtures.SOFTWARE_ID;
import static com.cantte.cetus.api.support.ConsoleFixtures.TECHNICAL_KEY;
import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

/** The issuer detail and update that let the console resume the setup assistant. */
@QuarkusTest
class IssuerResourceTest {

    @Test
    void newIssuerHasNoSetupPiecesYet() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Detail SAS");
        String issuerId = createIssuer(user);

        JsonPath detail = detail(user, issuerId);
        assertThat(detail.getString("status")).isEqualTo("ONBOARDING");
        assertThat(detail.getString("nit")).isEqualTo("900123456");
        assertThat(detail.getString("personType")).isEqualTo("LEGAL_ENTITY");
        assertThat(detail.getList("taxLevelCodes")).containsExactly("O-13");
        assertThat(detail.getBoolean("responsibleForIva")).isTrue();
        assertThat(detail.getString("address.municipalityCode")).isEqualTo("11001");
        assertThat(detail.getString("email")).isEqualTo("facturas@acme.test");
        assertThat(detail.getMap("software")).isNull();
        assertThat(detail.getMap("certificate")).isNull();
        assertThat(detail.getList("ranges")).isEmpty();
    }

    @Test
    void onboardedIssuerShowsItsPiecesWithoutSecrets() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Onboarded SAS");
        Onboarding onboarding = onboard(user);

        String body = user.request().get("/console/issuers/" + onboarding.issuerId())
                .then().statusCode(200).extract().asString();
        JsonPath detail = new JsonPath(body);
        assertThat(detail.getString("status")).isEqualTo("TESTING");
        assertThat(detail.getString("software.softwareId")).isEqualTo(SOFTWARE_ID);
        assertThat(detail.getString("software.testSetId")).isNotBlank();
        assertThat(detail.getString("certificate.subject")).isEqualTo("CN=Cetus Test Signer,O=Cantte,C=CO");
        assertThat(detail.getString("certificate.validTo")).isNotBlank();
        assertThat(detail.getList("ranges.id")).containsExactly(onboarding.rangeId());
        assertThat(body).doesNotContain(PIN).doesNotContain(TECHNICAL_KEY).doesNotContain(CERTIFICATE_PASSWORD);
    }

    @Test
    void issuerOfAnotherOrganizationIsNotFound() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Owner SAS");
        String issuerId = createIssuer(owner);
        ConsoleUser other = ConsoleUser.newOrganization();
        bootstrap(other, "Other SAS");

        other.request().get("/console/issuers/" + issuerId).then().statusCode(404);
        other.request().body(update("Intruder SAS")).put("/console/issuers/" + issuerId).then().statusCode(404);
    }

    @Test
    void updateChangesTheTaxDataAndAuditsTheChangedFields() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Update SAS");
        String issuerId = createIssuer(user);

        user.request().body(update("Acme Colombia SAS")).put("/console/issuers/" + issuerId)
                .then().statusCode(200)
                .body("legalName", equalTo("Acme Colombia SAS"))
                .body("nit", equalTo("900123456"))
                .body("responsibleForIva", equalTo(false))
                .body("taxLevelCodes", equalTo(List.of("O-47")));

        List<Map<String, Object>> entries = AuditTrailTest.entries(user, "ISSUER_UPDATED");
        assertThat(entries).singleElement().satisfies(entry -> {
            assertThat(entry).containsEntry("resourceType", "issuer").containsEntry("resourceId", issuerId);
            assertThat(AuditTrailTest.data(entry)).isEqualTo(Map.of(
                    "fields", List.of("legalName", "taxLevelCodes", "responsibleForIva")));
        });

        // Saving the same data again changes nothing and audits nothing.
        user.request().body(update("Acme Colombia SAS")).put("/console/issuers/" + issuerId)
                .then().statusCode(200);
        assertThat(AuditTrailTest.entries(user, "ISSUER_UPDATED")).hasSize(1);
    }

    @Test
    void issuerInHabilitacionCannotBeEdited() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Locked SAS");
        Onboarding onboarding = onboard(user);

        user.request().body(update("Changed SAS")).put("/console/issuers/" + onboarding.issuerId())
                .then().statusCode(422)
                .body("code", equalTo("issuer_locked"));
    }

    private static JsonPath detail(ConsoleUser user, String issuerId) {
        return user.request().get("/console/issuers/" + issuerId).then().statusCode(200).extract().jsonPath();
    }

    private static Map<String, Object> update(String legalName) {
        Map<String, Object> address = Map.of(
                "municipalityCode", "11001", "cityName", "Bogotá", "departmentCode", "11",
                "departmentName", "Bogotá", "postalCode", "110111", "line", "Calle 1 # 2-3",
                "countryCode", "CO", "countryName", "Colombia");
        return Map.of(
                "legalName", legalName, "personType", "LEGAL_ENTITY", "taxLevelCodes", List.of("O-47"),
                "responsibleForIva", false, "address", address, "email", "facturas@acme.test");
    }
}
