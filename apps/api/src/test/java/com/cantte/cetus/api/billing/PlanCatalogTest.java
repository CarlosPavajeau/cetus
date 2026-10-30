package com.cantte.cetus.api.billing;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

import com.cantte.cetus.api.admin.PlatformRoles;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import io.restassured.response.Response;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** The catalog of plans and the versions of their terms, public or private to one account. */
@QuarkusTest
class PlanCatalogTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);
    private static final ConsoleUser SUPPORT = ConsoleUser.platformStaff(PlatformRoles.SUPPORT);

    @Test
    void theCatalogComesLoadedWithItsTermsAndNoVat() {
        JsonPath offers = customer("Catálogo SAS")
                .request()
                .get("/console/plans")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();

        assertThat(offers.getList("code", String.class))
                .contains("INICIAL", "EMPRENDEDOR", "RECARGA_100")
                .doesNotContain("FREE", "SOCIOS");
        Map<String, Object> negocio = offers.getMap("find { it.code == 'NEGOCIO' }");
        assertThat(negocio).containsEntry("kind", "PACKAGE").containsEntry("validityMonths", 12);
        assertThat(offers.getMap("find { it.code == 'NEGOCIO' }.version"))
                .containsEntry("version", 2)
                .containsEntry("priceCents", 24_900_000)
                .containsEntry("taxIncluded", true)
                .containsEntry("baseCents", 24_900_000)
                .containsEntry("taxCents", 0)
                .containsEntry("totalCents", 24_900_000)
                .containsEntry("documentsIncluded", 1200)
                .containsEntry("issuersIncluded", 1)
                .containsEntry("priceOverageCents", null);
        assertThat(offers.getMap("find { it.code == 'RECARGA_100' }"))
                .containsEntry("kind", "TOPUP")
                .containsEntry("requiresKind", "PACKAGE");
        assertThat(offers.getMap("find { it.code == 'RECARGA_100' }.version")).containsEntry("issuersIncluded", null);
        assertThat(offers.getMap("find { it.code == 'INICIAL' }.version"))
                .containsEntry("priceCents", 3_900_000)
                .containsEntry("priceOverageCents", 15_000);
    }

    @Test
    void theVersionsWithVatWereClosedWhereTheOnesWithoutItStart() {
        String inicial = SUPPORT.request()
                .get("/admin/plans/catalog")
                .then()
                .extract()
                .jsonPath()
                .getString("find { it.code == 'INICIAL' }.id");

        List<Map<String, Object>> versions = SUPPORT.request()
                .get("/admin/plans/" + inicial + "/versions")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getList("$");

        assertThat(versions).extracting(version -> version.get("version")).containsExactly(2, 1);
        assertThat(versions.get(0)).containsEntry("taxRate", 0.0f).containsEntry("validTo", null);
        assertThat(versions.get(1)).containsEntry("taxRate", 0.19f);
        assertThat(versions.get(1).get("validTo")).isEqualTo(versions.get(0).get("validFrom"));
        assertThat(versions.get(0))
                .containsEntry("priceCents", versions.get(1).get("priceCents"))
                .containsEntry("documentsIncluded", versions.get(1).get("documentsIncluded"))
                .containsEntry("issuersIncluded", versions.get(1).get("issuersIncluded"))
                .containsEntry("priceOverageCents", versions.get(1).get("priceOverageCents"));
    }

    @Test
    void aNewVersionWaitsForItsStartAndClosesTheOneBefore() {
        String id = newPlan("PACKAGE", 12, null, true);
        ConsoleUser customer = customer("Compradora SAS");
        assertThat(codes(customer)).doesNotContain(codeOf(id));

        version(id, packageTerms(11_900_000))
                .then()
                .statusCode(200)
                .body("version", equalTo(1))
                .body("validTo", nullValue());
        OffsetDateTime next = OffsetDateTime.now().plusDays(30).truncatedTo(ChronoUnit.SECONDS);
        Map<String, Object> later = packageTerms(13_900_000);
        later.put("validFrom", next.toString());
        version(id, later).then().statusCode(200).body("version", equalTo(2));

        assertThat(customer.request()
                        .get("/console/plans")
                        .then()
                        .extract()
                        .jsonPath()
                        .getInt("find { it.id == '%s' }.version.version".formatted(id)))
                .isEqualTo(1);
        List<Map<String, Object>> versions = SUPPORT.request()
                .get("/admin/plans/" + id + "/versions")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getList("$");
        assertThat(versions).extracting(version -> version.get("version")).containsExactly(2, 1);
        assertThat(OffsetDateTime.parse((String) versions.get(1).get("validTo")))
                .isEqualTo(next);
    }

    @Test
    void aVersionHasTheTermsOfItsKindAndStartsAfterTheOneBefore() {
        String topUp = newPlan("TOPUP", 12, "PACKAGE", true);
        Map<String, Object> withIssuers = packageTerms(2_490_000);
        version(topUp, withIssuers).then().statusCode(422).body("code", equalTo("version_issuers_invalid"));
        String pack = newPlan("PACKAGE", 12, null, true);
        Map<String, Object> withOverage = packageTerms(100);
        withOverage.put("priceOverageCents", 15_000);
        version(pack, withOverage).then().statusCode(422).body("code", equalTo("version_overage_invalid"));
        String subscription = newPlan("SUBSCRIPTION", null, null, true);
        version(subscription, packageTerms(100))
                .then()
                .statusCode(422)
                .body("code", equalTo("version_overage_invalid"));

        version(pack, packageTerms(100)).then().statusCode(200);
        Map<String, Object> past = packageTerms(200);
        past.put("validFrom", OffsetDateTime.now().minusDays(1).toString());
        version(pack, past).then().statusCode(422).body("code", equalTo("version_valid_from_past"));
        Map<String, Object> later = packageTerms(200);
        later.put("validFrom", OffsetDateTime.now().plusDays(10).toString());
        version(pack, later).then().statusCode(200);
        Map<String, Object> before = packageTerms(300);
        before.put("validFrom", OffsetDateTime.now().plusDays(9).toString());
        version(pack, before).then().statusCode(422).body("code", equalTo("version_valid_from_before_current"));
        Map<String, Object> wholeRate = packageTerms(300);
        wholeRate.put("taxRate", "1");
        version(pack, wholeRate).then().statusCode(400);
        version(UUID.randomUUID().toString(), packageTerms(300)).then().statusCode(404);
    }

    @Test
    void anUnlistedPlanIsSoldThroughVersionsForOneAccount() {
        String socios = newPlan("SUBSCRIPTION", null, null, false);
        ConsoleUser partner = customer("Socia SAS");
        String partnerAccount =
                partner.request().get("/console/account").then().extract().path("id");
        ConsoleUser other = customer("Ajena SAS");
        Map<String, Object> terms = subscriptionTerms(100_000_000);

        version(socios, terms).then().statusCode(422).body("code", equalTo("version_account_required"));
        terms.put("accountId", partnerAccount);
        version(socios, terms).then().statusCode(200).body("accountId", equalTo(partnerAccount));
        Map<String, Object> listed = packageTerms(100);
        listed.put("accountId", partnerAccount);
        version(newPlan("PACKAGE", 12, null, true), listed)
                .then()
                .statusCode(422)
                .body("code", equalTo("version_private_listed"));

        assertThat(partner.request()
                        .get("/console/plans")
                        .then()
                        .extract()
                        .jsonPath()
                        .getLong("find { it.id == '%s' }.version.priceCents".formatted(socios)))
                .isEqualTo(100_000_000);
        assertThat(ids(other)).doesNotContain(socios);
    }

    @Test
    void aVersionIsNeverEditedOrDeleted() {
        String id = newPlan("PACKAGE", 12, null, true);
        version(id, packageTerms(100)).then().statusCode(200);
        UUID planId = UUID.fromString(id);

        assertThatThrownBy(() -> QuarkusTransaction.requiringNew()
                        .run(() -> PlanVersionEntity.findOpen(planId, null).orElseThrow().priceCents = 1))
                .hasStackTraceContaining("a plan version only takes its valid_to, once");
        assertThatThrownBy(() -> QuarkusTransaction.requiringNew()
                        .run(() -> PlanVersionEntity.findOpen(planId, null)
                                .orElseThrow()
                                .delete()))
                .hasStackTraceContaining("plan_versions are never deleted");
    }

    @Test
    void onlyAdminsAddPlansAndEachKindHasItsShape() {
        Map<String, Object> request = planRequest("PAQ_" + suffix(), "PACKAGE", 12, null, true);
        SUPPORT.request().body(request).post("/admin/plans").then().statusCode(403);
        customer("Curiosa SAS")
                .request()
                .body(request)
                .post("/admin/plans")
                .then()
                .statusCode(403);

        ADMIN.request()
                .body(planRequest("SUS_" + suffix(), "SUBSCRIPTION", 12, null, true))
                .post("/admin/plans")
                .then()
                .statusCode(422)
                .body("code", equalTo("plan_validity_invalid"));
        ADMIN.request()
                .body(planRequest("PAQ_" + suffix(), "PACKAGE", 12, "PACKAGE", true))
                .post("/admin/plans")
                .then()
                .statusCode(422)
                .body("code", equalTo("plan_requires_kind_invalid"));
        ADMIN.request()
                .body(planRequest("INICIAL", "SUBSCRIPTION", null, null, true))
                .post("/admin/plans")
                .then()
                .statusCode(422)
                .body("code", equalTo("plan_exists"));
        ADMIN.request()
                .body(planRequest("recarga minúscula", "TOPUP", 12, null, true))
                .post("/admin/plans")
                .then()
                .statusCode(400);
        assertThat(SUPPORT.request()
                        .get("/admin/plans/catalog")
                        .then()
                        .statusCode(200)
                        .extract()
                        .jsonPath()
                        .getList("code", String.class))
                .contains("FREE", "SOCIOS", "EMPRENDEDOR");
    }

    /** A new plan of the kind; returns its id. */
    private static String newPlan(String kind, Integer validityMonths, String requiresKind, boolean listed) {
        String code = kind.substring(0, 3) + "_" + suffix();
        return ADMIN.request()
                .body(planRequest(code, kind, validityMonths, requiresKind, listed))
                .post("/admin/plans")
                .then()
                .statusCode(200)
                .body("code", equalTo(code))
                .body("active", equalTo(true))
                .body("version", nullValue())
                .extract()
                .path("id");
    }

    private static Map<String, Object> planRequest(
            String code, String kind, Integer validityMonths, String requiresKind, boolean listed) {
        Map<String, Object> request =
                new HashMap<>(Map.of("code", code, "name", "Plan de prueba", "kind", kind, "listed", listed));
        if (validityMonths != null) {
            request.put("validityMonths", validityMonths);
        }
        if (requiresKind != null) {
            request.put("requiresKind", requiresKind);
        }
        return request;
    }

    private static Map<String, Object> packageTerms(long priceCents) {
        return new HashMap<>(Map.of(
                "priceCents",
                priceCents,
                "taxIncluded",
                true,
                "taxRate",
                "0.19",
                "documentsIncluded",
                300,
                "issuersIncluded",
                1));
    }

    private static Map<String, Object> subscriptionTerms(long priceCents) {
        Map<String, Object> terms = packageTerms(priceCents);
        terms.put("priceOverageCents", 4_000);
        return terms;
    }

    private static Response version(String planId, Map<String, Object> terms) {
        return ADMIN.request().body(terms).post("/admin/plans/" + planId + "/versions");
    }

    private static ConsoleUser customer(String name) {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, name);
        return user;
    }

    private static List<String> codes(ConsoleUser customer) {
        return customer.request()
                .get("/console/plans")
                .then()
                .extract()
                .jsonPath()
                .getList("code", String.class);
    }

    private static List<String> ids(ConsoleUser customer) {
        return customer.request()
                .get("/console/plans")
                .then()
                .extract()
                .jsonPath()
                .getList("id", String.class);
    }

    private static String codeOf(String planId) {
        return SUPPORT.request()
                .get("/admin/plans/catalog")
                .then()
                .extract()
                .jsonPath()
                .getString("find { it.id == '%s' }.code".formatted(planId));
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
    }
}
