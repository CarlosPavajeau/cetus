package com.cantte.cetus.api.billing;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.FakeWompiResource;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.PaymentChargeEntity;
import com.cantte.cetus.persistence.entity.PaymentMethodEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * The card that pays the renewals: saved from a token the browser got from Wompi, replaced, removed, and charged on
 * demand for a pending order.
 */
@QuarkusTest
@QuarkusTestResource(FakeWompiResource.class)
class PaymentMethodResourceTest {

    private record SaveRequest(
            String cardToken,
            String acceptanceToken,
            String personalDataAuthToken,
            String brand,
            int expMonth,
            int expYear) {}

    @Test
    void anOwnerSavesACardFromItsTokenAndEveryMemberSeesIt() {
        ConsoleUser owner = customer("Tarjeta SAS");

        owner.request()
                .get("/console/payment-method/setup")
                .then()
                .statusCode(200)
                .body("publicKey", equalTo("pub_test_cetus"))
                .body("tokenizationUrl", endsWith("/v1/tokens/cards"))
                .body("endUserPolicy.token", equalTo("eyJ.policy"))
                .body("endUserPolicy.permalink", equalTo("https://wompi.com/terminos.pdf"))
                .body("personalDataAuth.token", equalTo("eyJ.data"));
        owner.request().get("/console/payment-method").then().statusCode(404);

        save(owner, "tok_test_1")
                .then()
                .statusCode(200)
                .body("brand", equalTo("VISA"))
                .body("lastFour", equalTo("4242"))
                .body("expMonth", equalTo(8))
                .body("expYear", equalTo(2029));

        owner.member("member")
                .request()
                .get("/console/payment-method")
                .then()
                .statusCode(200)
                .body("lastFour", equalTo("4242"));
        UUID accountId = accountOf(owner);
        PaymentMethodEntity saved = QuarkusTransaction.requiringNew()
                .call(() -> PaymentMethodEntity.findActive(accountId).orElseThrow());
        assertThat(saved.customerEmail).isEqualTo("facturas@tarjeta.test");
        owner.request()
                .get("/console/audit-log")
                .then()
                .statusCode(200)
                .body("items.findAll { it.action == 'PAYMENT_METHOD_SAVED' }.size()", equalTo(1));
    }

    @Test
    void aNewCardReplacesTheOneBeforeAndARemovedCardIsGone() {
        ConsoleUser owner = customer("Reemplazo SAS");
        String first =
                save(owner, "tok_test_1").then().statusCode(200).extract().path("id");
        String second =
                save(owner, "tok_test_2").then().statusCode(200).extract().path("id");

        owner.request().get("/console/payment-method").then().statusCode(200).body("id", equalTo(second));
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() -> PaymentMethodEntity.<PaymentMethodEntity>findById(UUID.fromString(first)).status))
                .isEqualTo(PaymentMethodEntity.Status.REMOVED);

        owner.request().delete("/console/payment-method").then().statusCode(204);
        owner.request().get("/console/payment-method").then().statusCode(404);
        owner.request().delete("/console/payment-method").then().statusCode(404);
    }

    @Test
    void aCardWompiDoesNotAcceptIsNotSaved() {
        ConsoleUser owner = customer("Rechazada SAS");

        save(owner, FakeWompiResource.DECLINED_TOKEN)
                .then()
                .statusCode(422)
                .body("code", equalTo("payment_method_declined"));
        save(owner, FakeWompiResource.INVALID_TOKEN)
                .then()
                .statusCode(422)
                .body("code", equalTo("payment_method_declined"));
        owner.request().get("/console/payment-method").then().statusCode(404);
    }

    @Test
    void aCardNeedsTheBillingProfile() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Sin Perfil Tarjeta SAS");

        save(owner, "tok_test_1").then().statusCode(422).body("code", equalTo("billing_profile_required"));
    }

    @Test
    void onlyOwnersAndAdminsChangeTheCardAndNeverWhileImpersonating() {
        ConsoleUser owner = customer("Roles Tarjeta SAS");

        owner.member("member")
                .request()
                .body(request("tok_test_1"))
                .put("/console/payment-method")
                .then()
                .statusCode(403)
                .body("code", equalTo("organization_role_forbidden"));
        owner.impersonatedBy(UUID.randomUUID().toString())
                .body(request("tok_test_1"))
                .put("/console/payment-method")
                .then()
                .statusCode(403)
                .body("code", equalTo("impersonation_forbidden"));
        owner.impersonatedBy(UUID.randomUUID().toString())
                .post("/console/orders/" + UUID.randomUUID() + "/charge")
                .then()
                .statusCode(403)
                .body("code", equalTo("impersonation_forbidden"));
    }

    @Test
    void aPendingOrderIsChargedToTheCardOnDemand() {
        ConsoleUser owner = customer("Pagar Ahora SAS");
        String orderId = pendingOrder(owner);

        owner.request()
                .post("/console/orders/" + orderId + "/charge")
                .then()
                .statusCode(422)
                .body("code", equalTo("payment_method_required"));

        save(owner, "tok_test_1").then().statusCode(200);
        owner.request()
                .post("/console/orders/" + orderId + "/charge")
                .then()
                .statusCode(200)
                .body("charge.attempt", equalTo(1))
                .body("charge.origin", equalTo("MANUAL"))
                .body("charge.status", equalTo("SCHEDULED"));
        owner.request()
                .post("/console/orders/" + orderId + "/charge")
                .then()
                .statusCode(200)
                .body("charge.attempt", equalTo(2));

        List<PaymentChargeEntity> charges = chargesOf(orderId);
        assertThat(charges)
                .extracting(charge -> charge.status)
                .containsExactly(PaymentChargeEntity.Status.CANCELED, PaymentChargeEntity.Status.SCHEDULED);
        assertThat(charges.getLast().reference).endsWith("-2");
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() -> JobEntity.count(
                                "jobType = ?1 and referenceId = ?2", JobTypes.CHARGE_ORDER, charges.getLast().id)))
                .isEqualTo(1);

        QuarkusTransaction.requiringNew().run(() -> {
            PaymentChargeEntity sent = PaymentChargeEntity.findById(charges.getLast().id);
            sent.status = PaymentChargeEntity.Status.SUBMITTED;
        });
        owner.request()
                .post("/console/orders/" + orderId + "/charge")
                .then()
                .statusCode(409)
                .body("code", equalTo("charge_in_progress"));
        owner.request()
                .get("/console/orders/" + orderId)
                .then()
                .statusCode(200)
                .body("charge.status", equalTo("SUBMITTED"));
    }

    @Test
    void aPaidOrderIsNotChargedAgain() {
        ConsoleUser owner = customer("Ya Pagada SAS");
        String orderId = pendingOrder(owner);
        save(owner, "tok_test_1").then().statusCode(200);
        QuarkusTransaction.requiringNew().run(() -> {
            BillingOrderEntity order = BillingOrderEntity.findById(UUID.fromString(orderId));
            order.status = BillingOrderEntity.Status.PAID;
            order.paidAt = order.createdAt;
        });

        owner.request()
                .post("/console/orders/" + orderId + "/charge")
                .then()
                .statusCode(422)
                .body("code", equalTo("order_not_payable"));
        customer("Ajena Pagar SAS")
                .request()
                .post("/console/orders/" + orderId + "/charge")
                .then()
                .statusCode(404);
    }

    private static Response save(ConsoleUser owner, String token) {
        return owner.request().body(request(token)).put("/console/payment-method");
    }

    private static SaveRequest request(String token) {
        return new SaveRequest(token, "eyJ.policy", "eyJ.data", "VISA", 8, 2029);
    }

    private static String pendingOrder(ConsoleUser owner) {
        String version = owner.request()
                .get("/console/plans")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getString("find { it.code == 'EMPRENDEDOR' }.version.id");
        return owner.request()
                .body(Map.of("planVersionId", version))
                .post("/console/orders")
                .then()
                .statusCode(201)
                .extract()
                .path("id");
    }

    private static List<PaymentChargeEntity> chargesOf(String orderId) {
        return QuarkusTransaction.requiringNew().call(() -> PaymentChargeEntity.listByOrder(UUID.fromString(orderId)));
    }

    private static UUID accountOf(ConsoleUser owner) {
        return UUID.fromString(
                owner.request().get("/console/account").then().extract().path("id"));
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
                        "email", "facturas@" + name.split(" ")[0].toLowerCase() + ".test"))
                .put("/console/billing-profile")
                .then()
                .statusCode(200);
        return owner;
    }
}
