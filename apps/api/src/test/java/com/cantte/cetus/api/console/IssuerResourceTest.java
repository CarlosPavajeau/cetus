package com.cantte.cetus.api.console;

import com.cantte.cetus.api.support.ConsoleFixtures.Onboarding;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import io.restassured.response.ValidatableResponse;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.cantte.cetus.api.support.ConsoleFixtures.CERTIFICATE_PASSWORD;
import static com.cantte.cetus.api.support.ConsoleFixtures.PIN;
import static com.cantte.cetus.api.support.ConsoleFixtures.SOFTWARE_ID;
import static com.cantte.cetus.api.support.ConsoleFixtures.TECHNICAL_KEY;
import static com.cantte.cetus.api.support.ConsoleFixtures.addCreditNoteRange;
import static com.cantte.cetus.api.support.ConsoleFixtures.addRange;
import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.completeSetup;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

/** The issuer detail, and the update that resumes the setup assistant and keeps the issuer in line with its RUT. */
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
    void issuerInHabilitacionCanFollowItsRut() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Rut SAS");
        Onboarding onboarding = onboard(user);

        user.request().body(update("Acme Colombia SAS")).put("/console/issuers/" + onboarding.issuerId())
                .then().statusCode(200)
                .body("legalName", equalTo("Acme Colombia SAS"))
                .body("status", equalTo("TESTING"))
                .body("taxLevelCodes", equalTo(List.of("O-47")));
        assertThat(AuditTrailTest.entries(user, "ISSUER_UPDATED")).hasSize(1);
    }

    @Test
    void personTypeIsLockedOnceTheIssuerIsSetUp() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Person SAS");
        Onboarding onboarding = onboard(user);
        Map<String, Object> naturalPerson = new HashMap<>(update("Changed SAS"));
        naturalPerson.put("personType", "NATURAL_PERSON");

        user.request().body(naturalPerson).put("/console/issuers/" + onboarding.issuerId())
                .then().statusCode(422)
                .body("code", equalTo("person_type_locked"));
        assertThat(detail(user, onboarding.issuerId()).getString("legalName")).isNotEqualTo("Changed SAS");
    }

    @Test
    void productionInvoiceRangesAreQueuedForVerificationOnceTheIssuerCanSign() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Verify SAS");
        String issuerId = createIssuer(user, "900123456", "LIVE");
        // Without software and certificate the worker cannot ask the DIAN yet.
        String early = addRange(user, issuerId, "EARLY");
        assertThat(verificationJobs(early)).isZero();

        Onboarding onboarding = completeSetup(user, issuerId);
        String notes = addCreditNoteRange(user, issuerId);

        JsonPath detail = detail(user, issuerId);
        assertThat(detail.getString("ranges.find { it.id == '%s' }.verificationStatus".formatted(early))).isEqualTo("PENDING");
        assertThat(detail.getString("ranges.find { it.id == '%s' }.verificationStatus".formatted(onboarding.rangeId()))).isEqualTo("PENDING");
        assertThat(detail.getString("ranges.find { it.id == '%s' }.verificationStatus".formatted(notes))).isNull();
        assertThat(verificationJobs(early)).isEqualTo(1);

        // Asking again while it is pending does not queue a second job; once checked it does.
        verify(user, issuerId, early).statusCode(200).body("verificationStatus", equalTo("PENDING"));
        assertThat(verificationJobs(early)).isEqualTo(1);
        QuarkusTransaction.requiringNew().run(() -> NumberingRangeEntity.<NumberingRangeEntity>findById(UUID.fromString(early))
                .verificationStatus = NumberingRangeEntity.VerificationStatus.MISMATCH);
        verify(user, issuerId, early).statusCode(200).body("verificationStatus", equalTo("PENDING"));
        assertThat(verificationJobs(early)).isEqualTo(2);

        verify(user, issuerId, notes).statusCode(422).body("code", equalTo("range_not_verifiable"));
    }

    @Test
    void habilitacionRangesAreNotVerified() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Habilitacion SAS");
        Onboarding onboarding = onboard(user);

        // The shared test range (SETP) is not registered per NIT: GetNumberingRange always answers 301.
        assertThat(detail(user, onboarding.issuerId()).getString("ranges[0].verificationStatus")).isNull();
        assertThat(verificationJobs(onboarding.rangeId())).isZero();
        verify(user, onboarding.issuerId(), onboarding.rangeId()).statusCode(422)
                .body("code", equalTo("range_not_verifiable"));
    }

    private static ValidatableResponse verify(ConsoleUser user, String issuerId, String rangeId) {
        return user.request().post("/console/issuers/%s/numbering-ranges/%s/verification".formatted(issuerId, rangeId)).then();
    }

    private static long verificationJobs(String rangeId) {
        return QuarkusTransaction.requiringNew().call(() ->
                JobEntity.count("jobType = ?1 and referenceId = ?2", JobTypes.VERIFY_NUMBERING_RANGE, UUID.fromString(rangeId)));
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
