package com.cantte.cetus.api.billing;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

import com.cantte.cetus.api.admin.PlatformRoles;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.Credits;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Purchases placed from the console: built by the server from the catalog and signed for Wompi's checkout. */
@QuarkusTest
class OrderResourceTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);
    /** The integrity secret of the test profile. */
    private static final String INTEGRITY_SECRET = "test_integrity_cetus";

    @Inject
    Credits credits;

    @Test
    void anOwnerBuysAPackageAndGetsASignedCheckout() throws Exception {
        ConsoleUser owner = customer("Compradora SAS");
        String negocio = versionOf(owner, "NEGOCIO");

        JsonPath order = order(owner, negocio).then().statusCode(201).extract().jsonPath();

        String reference = order.getString("reference");
        assertThat(reference).matches("CET-[0-9A-HJKMNP-TV-Z]{26}");
        assertThat(order.getString("status")).isEqualTo("PENDING");
        assertThat(order.getString("kind")).isEqualTo("PURCHASE");
        assertThat(order.getLong("totalCents")).isEqualTo(24_900_000);
        assertThat(order.getLong("subtotalCents")).isEqualTo(24_900_000);
        assertThat(order.getLong("taxCents")).isZero();
        assertThat(order.getMap("items[0]"))
                .containsEntry("itemType", "PLAN")
                .containsEntry("planVersionId", negocio)
                .containsEntry("quantity", 1)
                .containsEntry("unitPriceCents", 24_900_000);
        Map<String, Object> checkout = order.getMap("checkout");
        assertThat(checkout)
                .containsEntry("publicKey", "pub_test_cetus")
                .containsEntry("reference", reference)
                .containsEntry("amountInCents", 24_900_000)
                .containsEntry("currency", "COP")
                .containsEntry("redirectUrl", "http://localhost:3000/billing/orders/" + order.getString("id"));
        assertThat(checkout.get("signature"))
                .isEqualTo(sha256(reference + 24_900_000 + "COP" + checkout.get("expirationTime") + INTEGRITY_SECRET));
        assertThat((String) checkout.get("link")).startsWith("https://checkout.wompi.co/p/?public-key=pub_test_cetus");

        String id = order.getString("id");
        owner.member("member")
                .request()
                .get("/console/orders/" + id)
                .then()
                .statusCode(200)
                .body("reference", equalTo(reference))
                .body("checkout.signature", equalTo(checkout.get("signature")));
        owner.request()
                .get("/console/orders")
                .then()
                .statusCode(200)
                .body("[0].id", equalTo(id))
                .body("[0].checkout.signature", equalTo(checkout.get("signature")));
        owner.request()
                .get("/console/audit-log")
                .then()
                .statusCode(200)
                .body("items.findAll { it.action == 'BILLING_ORDER_CREATED' }.size()", equalTo(1));
    }

    @Test
    void anOrderNeedsTheBillingProfile() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Sin Perfil SAS");

        order(owner, versionOf(owner, "EMPRENDEDOR"))
                .then()
                .statusCode(422)
                .body("code", equalTo("billing_profile_required"));
    }

    @Test
    void aTopUpNeedsAPackageInForce() {
        ConsoleUser owner = customer("Recarga SAS");
        UUID accountId = UUID.fromString(
                owner.request().get("/console/account").then().extract().path("id"));
        String topUp = versionOf(owner, "RECARGA_100");

        order(owner, topUp).then().statusCode(422).body("code", equalTo("plan_requires_product"));

        credits.grant(accountId, "RECARGA_500", 500, OffsetDateTime.now().plusMonths(6));
        credits.grant(accountId, "EMPRENDEDOR", 300, OffsetDateTime.now().minusDays(1));
        order(owner, topUp).then().statusCode(422).body("code", equalTo("plan_requires_product"));

        credits.grant(accountId, "EMPRENDEDOR", 1, OffsetDateTime.now().plusMonths(1));
        order(owner, topUp).then().statusCode(201).body("totalCents", equalTo(2_490_000));
    }

    @Test
    void subscriptionsAreNotSoldYet() {
        ConsoleUser owner = customer("Suscriptora SAS");

        order(owner, versionOf(owner, "INICIAL")).then().statusCode(422).body("code", equalTo("plan_not_purchasable"));
    }

    @Test
    void onlyAVersionOfferedToTheAccountIsSold() {
        ConsoleUser partner = customer("Socia Compradora SAS");
        ConsoleUser other = customer("Ajena Compradora SAS");
        String partnerAccount =
                partner.request().get("/console/account").then().extract().path("id");
        String privatePackage = privatePackage(partnerAccount);

        order(other, privatePackage).then().statusCode(422).body("code", equalTo("plan_version_not_offered"));
        order(other, UUID.randomUUID().toString())
                .then()
                .statusCode(422)
                .body("code", equalTo("plan_version_not_offered"));
        order(partner, privatePackage).then().statusCode(201).body("totalCents", equalTo(50_000_000));
    }

    @Test
    void membersOnlyReadAndOtherAccountsDoNotSeeTheOrder() {
        ConsoleUser owner = customer("Privada SAS");
        String negocio = versionOf(owner, "NEGOCIO");

        owner.member("member")
                .request()
                .body(Map.of("planVersionId", negocio))
                .post("/console/orders")
                .then()
                .statusCode(403)
                .body("code", equalTo("organization_role_forbidden"));
        String id = order(owner, negocio).then().extract().path("id");
        customer("Curiosa SAS").request().get("/console/orders/" + id).then().statusCode(404);
    }

    @Test
    void anExpiredOrderHasNoCheckout() {
        ConsoleUser owner = customer("Vencida SAS");
        String id =
                order(owner, versionOf(owner, "EMPRENDEDOR")).then().extract().path("id");

        QuarkusTransaction.requiringNew().run(() -> {
            BillingOrderEntity order = BillingOrderEntity.findById(UUID.fromString(id));
            order.expiresAt = OffsetDateTime.now().minusMinutes(1);
        });

        owner.request().get("/console/orders/" + id).then().statusCode(200).body("checkout", nullValue());
    }

    private static Response order(ConsoleUser owner, String planVersionId) {
        return owner.request().body(Map.of("planVersionId", planVersionId)).post("/console/orders");
    }

    /** An unlisted package with a version only for the account; returns the version's id. */
    private static String privatePackage(String accountId) {
        String code = "PRIV_"
                + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        String planId = ADMIN.request()
                .body(Map.of(
                        "code",
                        code,
                        "name",
                        "Paquete privado",
                        "kind",
                        "PACKAGE",
                        "validityMonths",
                        12,
                        "listed",
                        false))
                .post("/admin/plans")
                .then()
                .statusCode(200)
                .extract()
                .path("id");
        Map<String, Object> terms = new HashMap<>(Map.of(
                "priceCents",
                50_000_000,
                "taxIncluded",
                true,
                "taxRate",
                "0",
                "documentsIncluded",
                5000,
                "issuersIncluded",
                3,
                "accountId",
                accountId));
        return ADMIN.request()
                .body(terms)
                .post("/admin/plans/" + planId + "/versions")
                .then()
                .statusCode(200)
                .extract()
                .path("id");
    }

    private static String versionOf(ConsoleUser customer, String code) {
        return customer.request()
                .get("/console/plans")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getString("find { it.code == '%s' }.version.id".formatted(code));
    }

    private static ConsoleUser customer(String name) {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, name);
        owner.request()
                .body(Map.of(
                        "personType", "LEGAL_ENTITY",
                        "identificationType", "NIT",
                        "identificationNumber", "900123456",
                        "legalName", name,
                        "taxLevelCodes", List.of("O-13"),
                        "taxScheme", "IVA",
                        "email", "facturas@compradora.test"))
                .put("/console/billing-profile")
                .then()
                .statusCode(200);
        return owner;
    }

    private static String sha256(String text) throws Exception {
        return HexFormat.of()
                .formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
    }
}
