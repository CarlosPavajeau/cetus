package com.cantte.cetus.api.billing;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

import com.cantte.cetus.api.admin.PlatformRoles;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.persistence.entity.PlanPriceEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Admins put packages and top-ups on sale with versioned prices; customers see the price that applies now. */
@QuarkusTest
class PlanCatalogTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);
    private static final ConsoleUser SUPPORT = ConsoleUser.platformStaff(PlatformRoles.SUPPORT);

    @Test
    void aPackageIsSoldAtTheCurrentVersionOfItsPrice() {
        String code = newPackage();
        ConsoleUser customer = ConsoleUser.newOrganization();
        bootstrap(customer, "Compradora SAS");
        customer.request().get("/console/plans").then().statusCode(200).body("code", not(hasItem(code)));

        price(code, 39_000_000, "0.19", null)
                .then()
                .statusCode(200)
                .body("version", equalTo(1))
                .body("taxCents", equalTo(7_410_000))
                .body("totalCents", equalTo(46_410_000))
                .body("validTo", nullValue());
        JsonPath offers = customer.request()
                .get("/console/plans")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        Map<String, Object> offer = offers.getMap("find { it.code == '%s' }".formatted(code));
        assertThat(offer).containsEntry("kind", "PACKAGE").containsEntry("documentsIncluded", 1200);
        assertThat(offers.getInt("find { it.code == '%s' }.price.totalCents".formatted(code)))
                .isEqualTo(46_410_000);

        OffsetDateTime next = OffsetDateTime.now().plusDays(30).truncatedTo(ChronoUnit.SECONDS);
        price(code, 45_000_000, "0.19", next).then().statusCode(200).body("version", equalTo(2));

        assertThat(customer.request()
                        .get("/console/plans")
                        .then()
                        .extract()
                        .jsonPath()
                        .getInt("find { it.code == '%s' }.price.version".formatted(code)))
                .isEqualTo(1);
        List<Map<String, Object>> versions = SUPPORT.request()
                .get("/admin/plans/" + code + "/prices")
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
    void aPriceStartsAfterTheOneBeforeAndNeverInThePast() {
        String code = newPackage();
        price(code, 100, "0.19", null).then().statusCode(200);

        price(code, 200, "0.19", OffsetDateTime.now().minusDays(1))
                .then()
                .statusCode(422)
                .body("code", equalTo("price_valid_from_past"));
        OffsetDateTime later = OffsetDateTime.now().plusDays(10);
        price(code, 200, "0.19", later).then().statusCode(200);
        price(code, 300, "0.19", later.minusDays(1))
                .then()
                .statusCode(422)
                .body("code", equalTo("price_valid_from_before_current"));
        price(code, 300, "1", null).then().statusCode(400);
        price("NO_EXISTE_" + suffix(), 300, "0.19", null).then().statusCode(404);
    }

    @Test
    void aPriceIsNeverEditedOrDeleted() {
        String code = newPackage();
        price(code, 100, "0.19", null).then().statusCode(200);

        assertThatThrownBy(() -> QuarkusTransaction.requiringNew()
                        .run(() -> PlanPriceEntity.findOpen(code).orElseThrow().amountCents = 1))
                .hasStackTraceContaining("a plan price only takes its valid_to, once");
        assertThatThrownBy(() -> QuarkusTransaction.requiringNew()
                        .run(() -> PlanPriceEntity.findOpen(code).orElseThrow().delete()))
                .hasStackTraceContaining("plan_prices are never deleted");
    }

    @Test
    void onlyAdminsPutPackagesOnSaleAndSubscriptionsComeByMigration() {
        Map<String, Object> request = planRequest("PAQ_" + suffix(), "PACKAGE");
        SUPPORT.request().body(request).post("/admin/plans").then().statusCode(403);
        ConsoleUser customer = ConsoleUser.newOrganization();
        bootstrap(customer, "Curiosa SAS");
        customer.request().body(request).post("/admin/plans").then().statusCode(403);

        ADMIN.request()
                .body(planRequest("SUS_" + suffix(), "SUBSCRIPTION"))
                .post("/admin/plans")
                .then()
                .statusCode(422)
                .body("code", equalTo("plan_kind_invalid"));
        ADMIN.request()
                .body(planRequest("INICIAL", "TOPUP"))
                .post("/admin/plans")
                .then()
                .statusCode(422)
                .body("code", equalTo("plan_exists"));
        ADMIN.request()
                .body(planRequest("recarga minúscula", "TOPUP"))
                .post("/admin/plans")
                .then()
                .statusCode(400);
    }

    private static String newPackage() {
        String code = "PAQ_" + suffix();
        ADMIN.request()
                .body(planRequest(code, "PACKAGE"))
                .post("/admin/plans")
                .then()
                .statusCode(200)
                .body("code", equalTo(code))
                .body("active", equalTo(true))
                .body("price", nullValue());
        return code;
    }

    private static Map<String, Object> planRequest(String code, String kind) {
        return Map.of(
                "code", code, "name", "Paquete 1.200", "kind", kind, "documentsIncluded", 1200, "validityMonths", 12);
    }

    private static io.restassured.response.Response price(
            String code, long amountCents, String taxRate, OffsetDateTime validFrom) {
        Map<String, Object> request = new HashMap<>(Map.of("amountCents", amountCents, "taxRate", taxRate));
        if (validFrom != null) {
            request.put("validFrom", validFrom.toString());
        }
        return ADMIN.request().body(request).post("/admin/plans/" + code + "/prices");
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
    }
}
