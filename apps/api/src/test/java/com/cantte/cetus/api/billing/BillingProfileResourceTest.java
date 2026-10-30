package com.cantte.cetus.api.billing;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

/** Who Cetus invoices for an account's purchases, validated like the customer of an invoice. */
@QuarkusTest
class BillingProfileResourceTest {

    @Test
    void anOwnerRegistersTheProfileWithItsCheckDigitAndChangesIt() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Facturada SAS");
        owner.request().get("/console/billing-profile").then().statusCode(404);

        owner.request()
                .body(profile("facturas@facturada.test"))
                .put("/console/billing-profile")
                .then()
                .statusCode(200)
                .body("identificationNumber", equalTo("900123456"))
                .body("checkDigit", equalTo("8"))
                .body("taxLevelCodes", contains("O-13"))
                .body("taxScheme", equalTo("IVA"))
                .body("email", equalTo("facturas@facturada.test"));
        owner.request()
                .body(profile("contabilidad@facturada.test"))
                .put("/console/billing-profile")
                .then()
                .statusCode(200);

        owner.member("member")
                .request()
                .get("/console/billing-profile")
                .then()
                .statusCode(200)
                .body("email", equalTo("contabilidad@facturada.test"));
        owner.request()
                .get("/console/audit-log")
                .then()
                .statusCode(200)
                .body("items.findAll { it.action == 'BILLING_PROFILE_UPDATED' }.size()", equalTo(2));
    }

    @Test
    void theProfileNeedsAnEmailAndAValidCheckDigit() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Incompleta SAS");

        owner.request()
                .body(profile(null))
                .put("/console/billing-profile")
                .then()
                .statusCode(422)
                .body("code", equalTo("billing_profile_email_required"));
        Map<String, Object> wrongDigit = profile("facturas@incompleta.test");
        wrongDigit.put("checkDigit", "1");
        owner.request()
                .body(wrongDigit)
                .put("/console/billing-profile")
                .then()
                .statusCode(422)
                .body("code", equalTo("customer_check_digit_invalid"));
    }

    @Test
    void firstSavesAtOnceBothSucceed() throws Exception {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Simultanea SAS");
        ClassLoader classes = Thread.currentThread().getContextClassLoader();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2, task -> {
            Thread thread = new Thread(task);
            thread.setContextClassLoader(classes);
            return thread;
        });
        try {
            List<Future<Integer>> saves = new ArrayList<>();
            for (String email : List.of("a@simultanea.test", "b@simultanea.test")) {
                saves.add(pool.submit(() -> {
                    start.await();
                    return owner.request()
                            .body(profile(email))
                            .put("/console/billing-profile")
                            .statusCode();
                }));
            }
            start.countDown();
            for (Future<Integer> save : saves) {
                assertThat(save.get(30, TimeUnit.SECONDS)).isEqualTo(200);
            }
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void onlyOwnersAndAdminsChangeIt() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Roles SAS");

        owner.member("member")
                .request()
                .body(profile("facturas@roles.test"))
                .put("/console/billing-profile")
                .then()
                .statusCode(403)
                .body("code", equalTo("organization_role_forbidden"));
        owner.member("admin")
                .request()
                .body(profile("facturas@roles.test"))
                .put("/console/billing-profile")
                .then()
                .statusCode(200);
    }

    private static Map<String, Object> profile(String email) {
        Map<String, Object> profile = new HashMap<>(Map.of(
                "personType", "LEGAL_ENTITY",
                "identificationType", "NIT",
                "identificationNumber", "900123456",
                "legalName", "Facturada SAS",
                "taxLevelCodes", List.of("O-13"),
                "taxScheme", "IVA",
                "address",
                        Map.of(
                                "municipalityCode", "11001",
                                "cityName", "Bogotá, D.C.",
                                "departmentCode", "11",
                                "departmentName", "Bogotá",
                                "line", "Calle 93 # 11-26")));
        if (email != null) {
            profile.put("email", email);
        }
        return profile;
    }
}
