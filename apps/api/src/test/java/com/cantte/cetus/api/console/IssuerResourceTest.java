package com.cantte.cetus.api.console;

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
import static com.cantte.cetus.api.support.ConsoleFixtures.rangeRequest;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

import com.cantte.cetus.api.support.ConsoleFixtures.Onboarding;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import io.restassured.response.ValidatableResponse;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

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

        String body = user.request()
                .get("/console/issuers/" + onboarding.issuerId())
                .then()
                .statusCode(200)
                .extract()
                .asString();
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
    void aNitHasOneIssuerPerEnvironment() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Duplicate SAS");
        createIssuer(user, "900123456", "TEST");
        // An issuer already enabled at the DIAN starts directly in production, next to its test issuer.
        createIssuer(user, "900123456", "LIVE");

        Map<String, Object> again = new HashMap<>(update("Acme SAS"));
        again.put("environment", "LIVE");
        again.put("nit", "900123456");
        user.request()
                .body(again)
                .post("/console/issuers")
                .then()
                .statusCode(422)
                .body("code", equalTo("issuer_already_exists"));
    }

    @Test
    void issuerOfAnotherOrganizationIsNotFound() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Owner SAS");
        String issuerId = createIssuer(owner);
        ConsoleUser other = ConsoleUser.newOrganization();
        bootstrap(other, "Other SAS");

        other.request().get("/console/issuers/" + issuerId).then().statusCode(404);
        other.request()
                .body(update("Intruder SAS"))
                .put("/console/issuers/" + issuerId)
                .then()
                .statusCode(404);
    }

    @Test
    void updateChangesTheTaxDataAndAuditsTheChangedFields() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Update SAS");
        String issuerId = createIssuer(user);

        user.request()
                .body(update("Acme Colombia SAS"))
                .put("/console/issuers/" + issuerId)
                .then()
                .statusCode(200)
                .body("legalName", equalTo("Acme Colombia SAS"))
                .body("nit", equalTo("900123456"))
                .body("responsibleForIva", equalTo(false))
                .body("taxLevelCodes", equalTo(List.of("O-47")));

        List<Map<String, Object>> entries = AuditTrailTest.entries(user, "ISSUER_UPDATED");
        assertThat(entries).singleElement().satisfies(entry -> {
            assertThat(entry).containsEntry("resourceType", "issuer").containsEntry("resourceId", issuerId);
            assertThat(AuditTrailTest.data(entry))
                    .isEqualTo(Map.of("fields", List.of("legalName", "taxLevelCodes", "responsibleForIva")));
        });

        // Saving the same data again changes nothing and audits nothing.
        user.request()
                .body(update("Acme Colombia SAS"))
                .put("/console/issuers/" + issuerId)
                .then()
                .statusCode(200);
        assertThat(AuditTrailTest.entries(user, "ISSUER_UPDATED")).hasSize(1);
    }

    @Test
    void issuerInHabilitacionCanFollowItsRut() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Rut SAS");
        Onboarding onboarding = onboard(user);

        user.request()
                .body(update("Acme Colombia SAS"))
                .put("/console/issuers/" + onboarding.issuerId())
                .then()
                .statusCode(200)
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

        user.request()
                .body(naturalPerson)
                .put("/console/issuers/" + onboarding.issuerId())
                .then()
                .statusCode(422)
                .body("code", equalTo("person_type_locked"));
        assertThat(detail(user, onboarding.issuerId()).getString("legalName")).isNotEqualTo("Changed SAS");
    }

    @Test
    void productionInvoiceRangesAreQueuedForVerificationOnceTheIssuerCanSign() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Verify SAS");
        String issuerId = createIssuer(user, "900123456", "LIVE");
        // Without software and certificate the worker cannot ask the DIAN yet.
        String early = addRange(user, issuerId, "EARL");
        assertThat(verificationJobs(early)).isZero();

        Onboarding onboarding = completeSetup(user, issuerId);
        String notes = addCreditNoteRange(user, issuerId);

        JsonPath detail = detail(user, issuerId);
        assertThat(detail.getString("ranges.find { it.id == '%s' }.verificationStatus".formatted(early)))
                .isEqualTo("PENDING");
        assertThat(detail.getString("ranges.find { it.id == '%s' }.verificationStatus".formatted(onboarding.rangeId())))
                .isEqualTo("PENDING");
        assertThat(detail.getString("ranges.find { it.id == '%s' }.verificationStatus".formatted(notes)))
                .isNull();
        assertThat(verificationJobs(early)).isEqualTo(1);

        // Asking again while it is pending does not queue a second job; once checked it does.
        verify(user, issuerId, early).statusCode(200).body("verificationStatus", equalTo("PENDING"));
        assertThat(verificationJobs(early)).isEqualTo(1);
        QuarkusTransaction.requiringNew()
                .run(() ->
                        NumberingRangeEntity.<NumberingRangeEntity>findById(UUID.fromString(early)).verificationStatus =
                                NumberingRangeEntity.VerificationStatus.MISMATCH);
        verify(user, issuerId, early).statusCode(200).body("verificationStatus", equalTo("PENDING"));
        assertThat(verificationJobs(early)).isEqualTo(2);

        // A request left waiting too long, as if its job was lost, can be made again.
        QuarkusTransaction.requiringNew()
                .run(() -> NumberingRangeEntity.<NumberingRangeEntity>findById(UUID.fromString(early))
                                .verificationRequestedAt =
                        OffsetDateTime.now().minus(IssuerOnboardingService.VERIFICATION_STALE));
        verify(user, issuerId, early)
                .statusCode(200)
                .body("verificationStatus", equalTo("PENDING"))
                .body("verificationRequestedAt", notNullValue());
        assertThat(verificationJobs(early)).isEqualTo(3);

        verify(user, issuerId, notes).statusCode(422).body("code", equalTo("range_not_verifiable"));
    }

    @Test
    void aProductionRangeWithoutTechnicalKeyWaitsForTheDians() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Sin clave SAS");
        String issuerId =
                completeSetup(user, createIssuer(user, "900123456", "LIVE")).issuerId();
        Map<String, Object> request = rangeRequest("FE");
        request.remove("technicalKey");

        String rangeId = user.request()
                .body(request)
                .post("/console/issuers/" + issuerId + "/numbering-ranges")
                .then()
                .statusCode(200)
                .body("hasTechnicalKey", equalTo(false))
                .body("verificationStatus", equalTo("PENDING"))
                .extract()
                .path("id");

        assertThat(verificationJobs(rangeId)).isEqualTo(1);
        assertThat(technicalKeySealed(rangeId)).isNull();
    }

    @Test
    void aHabilitacionRangeNeedsItsTechnicalKey() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Habilitacion sin clave SAS");
        String issuerId = createIssuer(user, "900123456");
        Map<String, Object> request = rangeRequest("SETP");
        request.remove("technicalKey");

        user.request()
                .body(request)
                .post("/console/issuers/" + issuerId + "/numbering-ranges")
                .then()
                .statusCode(422)
                .body("code", equalTo("technical_key_required"));
    }

    private static void postRange(
            ConsoleUser user, String issuerId, Map<String, Object> request, int status, String code) {
        ValidatableResponse response = user.request()
                .body(request)
                .post("/console/issuers/" + issuerId + "/numbering-ranges")
                .then()
                .statusCode(status);
        if (code != null) {
            response.body("code", equalTo(code));
        }
    }

    @Test
    void aRangeCannotRepeatTheNumbersOfAnother() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Rangos repetidos SAS");
        String issuerId = createIssuer(user);
        addRange(user, issuerId, "SETP");

        postRange(user, issuerId, rangeRequest("SETP"), 422, "range_overlap");

        Map<String, Object> tail = rangeRequest("SETP");
        tail.put("from", 995000000);
        tail.put("to", 995000100);
        postRange(user, issuerId, tail, 422, "range_overlap");

        Map<String, Object> adjacent = rangeRequest("SETP");
        adjacent.put("from", 995000001);
        adjacent.put("to", 995001000);
        postRange(user, issuerId, adjacent, 200, null);

        postRange(user, issuerId, rangeRequest("SETT"), 200, null);
    }

    @Test
    void aRangeOfAnotherDocumentTypeMayReuseTheNumbers() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Tipos distintos SAS");
        String issuerId = createIssuer(user);
        Map<String, Object> invoice = rangeRequest("NC");
        invoice.put("from", 1);
        invoice.put("to", 1000);
        postRange(user, issuerId, invoice, 200, null);

        Map<String, Object> creditNote = Map.of("documentType", "CREDIT_NOTE", "prefix", "NC", "from", 1, "to", 1000);
        postRange(user, issuerId, creditNote, 200, null);
    }

    @Test
    void aRangeCannotEndBeforeItStarts() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Fechas invertidas SAS");
        String issuerId = createIssuer(user);
        Map<String, Object> request = rangeRequest("SETP");
        request.put("validFrom", "2027-01-01");
        request.put("validTo", "2026-12-31");

        postRange(user, issuerId, request, 422, "range_invalid");
    }

    @Test
    void aMismatchedTechnicalKeyIsReplacedWithTheDians() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Clave errada SAS");
        Onboarding onboarding = completeSetup(user, createIssuer(user, "900123456", "LIVE"));
        String rangeId = onboarding.rangeId();
        assertThat(detail(user, onboarding.issuerId())
                        .getBoolean("ranges.find { it.id == '%s' }.hasTechnicalKey".formatted(rangeId)))
                .isTrue();
        QuarkusTransaction.requiringNew()
                .run(() -> NumberingRangeEntity.<NumberingRangeEntity>findById(UUID.fromString(rangeId))
                                .verificationStatus =
                        NumberingRangeEntity.VerificationStatus.MISMATCH);

        user.request()
                .post("/console/issuers/%s/numbering-ranges/%s/technical-key-from-dian"
                        .formatted(onboarding.issuerId(), rangeId))
                .then()
                .statusCode(200)
                .body("hasTechnicalKey", equalTo(false))
                .body("verificationStatus", equalTo("PENDING"));

        assertThat(technicalKeySealed(rangeId)).isNull();
        assertThat(verificationJobs(rangeId)).isEqualTo(2);
        assertThat(AuditTrailTest.entries(user, "TECHNICAL_KEY_REQUESTED_FROM_DIAN"))
                .singleElement()
                .satisfies(entry ->
                        assertThat(AuditTrailTest.data(entry)).isEqualTo(Map.of("rangeId", rangeId, "prefix", "SETP")));
    }

    @Test
    void habilitacionRangesAreNotVerified() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Habilitacion SAS");
        Onboarding onboarding = onboard(user);

        // The shared test range (SETP) is not registered per NIT: GetNumberingRange always answers 301.
        assertThat(detail(user, onboarding.issuerId()).getString("ranges[0].verificationStatus"))
                .isNull();
        assertThat(verificationJobs(onboarding.rangeId())).isZero();
        verify(user, onboarding.issuerId(), onboarding.rangeId())
                .statusCode(422)
                .body("code", equalTo("range_not_verifiable"));
    }

    private static ValidatableResponse verify(ConsoleUser user, String issuerId, String rangeId) {
        return user.request()
                .post("/console/issuers/%s/numbering-ranges/%s/verification".formatted(issuerId, rangeId))
                .then();
    }

    private static byte[] technicalKeySealed(String rangeId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> NumberingRangeEntity.<NumberingRangeEntity>findById(UUID.fromString(rangeId))
                        .technicalKeySealed);
    }

    private static long verificationJobs(String rangeId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> JobEntity.count(
                        "jobType = ?1 and referenceId = ?2",
                        JobTypes.VERIFY_NUMBERING_RANGE,
                        UUID.fromString(rangeId)));
    }

    private static JsonPath detail(ConsoleUser user, String issuerId) {
        return user.request()
                .get("/console/issuers/" + issuerId)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
    }

    private static Map<String, Object> update(String legalName) {
        Map<String, Object> address = Map.of(
                "municipalityCode",
                "11001",
                "cityName",
                "Bogotá",
                "departmentCode",
                "11",
                "departmentName",
                "Bogotá",
                "postalCode",
                "110111",
                "line",
                "Calle 1 # 2-3",
                "countryCode",
                "CO",
                "countryName",
                "Colombia");
        return Map.of(
                "legalName",
                legalName,
                "personType",
                "LEGAL_ENTITY",
                "taxLevelCodes",
                List.of("O-47"),
                "responsibleForIva",
                false,
                "address",
                address,
                "email",
                "facturas@acme.test");
    }
}
