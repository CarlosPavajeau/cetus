package com.cantte.cetus.api.admin;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.PaymentReversalEntity;
import com.cantte.cetus.persistence.entity.PaymentTransactionEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import io.restassured.response.Response;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * The Cetus team gives money of a paid order back, registers chargebacks and forgives debts; a debt blocks purchases
 * until it is paid or forgiven, and the month's sales are crossed with Wompi and the invoices.
 */
@QuarkusTest
class AdminOrderResourceTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);
    private static final ConsoleUser SUPPORT = ConsoleUser.platformStaff(PlatformRoles.SUPPORT);
    private static final long TOTAL_CENTS = 11_900_000;

    @Test
    void anAdminRefundsPartOfAPaidOrderOnceAtATime() {
        Customer customer = customer("Reembolsada SAS");
        UUID orderId = paidOrder(customer.accountId(), true);

        JsonPath listed = SUPPORT.request()
                .get(path(customer.accountId(), ""))
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertThat(listed.getString("[0].id")).isEqualTo(orderId.toString());
        assertThat(listed.getLong("[0].refundableCents")).isEqualTo(TOTAL_CENTS);
        assertThat(listed.getString("[0].transactionId")).isNotBlank();

        SUPPORT.request()
                .body(refund(1_000_000, "EXTERNAL"))
                .post(path(customer.accountId(), "/" + orderId + "/refunds"))
                .then()
                .statusCode(403);
        ADMIN.request()
                .body(refund(TOTAL_CENTS + 1, "EXTERNAL"))
                .post(path(customer.accountId(), "/" + orderId + "/refunds"))
                .then()
                .statusCode(422)
                .body("code", equalTo("refund_exceeds_paid"));
        JsonPath refunded = ADMIN.request()
                .body(refund(1_000_000, "WOMPI"))
                .post(path(customer.accountId(), "/" + orderId + "/refunds"))
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertThat(refunded.getString("reversals[0].status")).isEqualTo("REQUESTED");
        assertThat(refunded.getString("reversals[0].mode")).isEqualTo("WOMPI");
        String reversalId = refunded.getString("reversals[0].id");
        assertThat(jobs(JobTypes.REFUND_ORDER, UUID.fromString(reversalId))).hasSize(1);

        ADMIN.request()
                .body(Map.of("reason", "El banco lo reversó"))
                .post(path(customer.accountId(), "/" + orderId + "/chargeback"))
                .then()
                .statusCode(409)
                .body("code", equalTo("reversal_in_progress"));
    }

    @Test
    void aWompiRefundNeedsAnApprovedWompiPayment() {
        Customer customer = customer("Sin Transacción SAS");
        UUID orderId = paidOrder(customer.accountId(), false);

        ADMIN.request()
                .body(refund(1_000_000, "WOMPI"))
                .post(path(customer.accountId(), "/" + orderId + "/refunds"))
                .then()
                .statusCode(422)
                .body("code", equalTo("payment_transaction_missing"));
    }

    @Test
    void aChargebackReversesWhatIsLeftOfTheOrder() {
        Customer customer = customer("Contracargo SAS");
        UUID orderId = paidOrder(customer.accountId(), true);

        JsonPath order = ADMIN.request()
                .body(Map.of("reason", "Wompi avisó un contracargo"))
                .post(path(customer.accountId(), "/" + orderId + "/chargeback"))
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();

        assertThat(order.getString("reversals[0].kind")).isEqualTo("CHARGEBACK");
        assertThat(order.getLong("reversals[0].amountCents")).isEqualTo(TOTAL_CENTS);
        assertThat(jobs(JobTypes.APPLY_REVERSAL, UUID.fromString(order.getString("reversals[0].id"))))
                .hasSize(1);
    }

    @Test
    void aDebtBlocksPurchasesUntilItIsForgiven() {
        Customer customer = customer("Deudora SAS");
        UUID debtId = debt(customer.accountId());
        String emprendedor = customer.owner()
                .request()
                .get("/console/plans")
                .then()
                .extract()
                .jsonPath()
                .getString("find { it.code == 'EMPRENDEDOR' }.version.id");

        buy(customer.owner(), emprendedor).then().statusCode(422).body("code", equalTo("account_has_debt"));
        customer.owner()
                .request()
                .get("/console/orders/" + debtId)
                .then()
                .statusCode(200)
                .body("kind", equalTo("DEBT"))
                .body("expiresAt", nullValue())
                .body("checkout.amountInCents", equalTo(500_000));

        UUID paid = paidOrder(customer.accountId(), true);
        ADMIN.request()
                .body(Map.of("reason", "No es una deuda"))
                .post(path(customer.accountId(), "/" + paid + "/waiver"))
                .then()
                .statusCode(422)
                .body("code", equalTo("order_not_debt"));
        ADMIN.request()
                .body(Map.of("reason", "Cortesía por la demora"))
                .post(path(customer.accountId(), "/" + debtId + "/waiver"))
                .then()
                .statusCode(200)
                .body("status", equalTo("CANCELED"));

        buy(customer.owner(), emprendedor).then().statusCode(201);
    }

    @Test
    void aRefundWompiNeverAnsweredIsResolvedByAPerson() {
        Customer customer = customer("Sin Respuesta SAS");
        UUID orderId = paidOrder(customer.accountId(), true);
        UUID reversalId = submitted(orderId);

        JsonPath resolved = ADMIN.request()
                .body(Map.of("approved", false, "reason", "No aparece en el panel de Wompi"))
                .post(path(customer.accountId(), "/" + orderId + "/reversals/" + reversalId + "/resolution"))
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();

        assertThat(resolved.getString("reversals[0].status")).isEqualTo("FAILED");
        assertThat(resolved.getString("reversals[0].failureMessage")).isEqualTo("No aparece en el panel de Wompi");
        ADMIN.request()
                .body(Map.of("approved", true, "reason", "Otra vez"))
                .post(path(customer.accountId(), "/" + orderId + "/reversals/" + reversalId + "/resolution"))
                .then()
                .statusCode(422)
                .body("code", equalTo("reversal_not_unresolved"));
    }

    @Test
    void theMonthsReconciliationShowsWhatDoesNotAddUp() {
        Customer customer = customer("Conciliada SAS");
        OffsetDateTime inMonth = OffsetDateTime.parse("2097-05-10T12:00:00-05:00");
        UUID withPayment = paidOrder(customer.accountId(), true, inMonth);
        UUID withoutPayment = paidOrder(customer.accountId(), false, inMonth);

        JsonPath month = SUPPORT.request()
                .get("/admin/billing/reconciliation?month=2097-05")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();

        assertThat(month.getLong("paidCents")).isEqualTo(2 * TOTAL_CENTS);
        assertThat(month.getLong("netCents")).isEqualTo(2 * TOTAL_CENTS);
        assertThat(month.getList("orders.find { it.orderId == '%s' }.issues".formatted(withPayment), String.class))
                .containsExactly("INVOICE_MISSING");
        assertThat(month.getList("orders.find { it.orderId == '%s' }.issues".formatted(withoutPayment), String.class))
                .containsExactly("PAYMENT_MISSING", "INVOICE_MISSING");
        SUPPORT.request()
                .get("/admin/billing/reconciliation?month=2097-13")
                .then()
                .statusCode(400);
        customer.owner()
                .request()
                .get("/admin/billing/reconciliation?month=2097-05")
                .then()
                .statusCode(403);
    }

    private record Customer(ConsoleUser owner, UUID accountId) {}

    private static Customer customer(String name) {
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
                        "email", "facturas@reversos.test"))
                .put("/console/billing-profile")
                .then()
                .statusCode(200);
        UUID accountId = UUID.fromString(
                owner.request().get("/console/account").then().extract().path("id"));
        return new Customer(owner, accountId);
    }

    private static UUID paidOrder(UUID accountId, boolean withPayment) {
        return paidOrder(accountId, withPayment, OffsetDateTime.now());
    }

    /** An order of the account paid at the instant, with Wompi's approved transaction or without one. */
    private static UUID paidOrder(UUID accountId, boolean withPayment, OffsetDateTime paidAt) {
        return QuarkusTransaction.requiringNew().call(() -> {
            BillingOrderEntity order = order(accountId, BillingOrderEntity.Kind.PURCHASE, paidAt.plusDays(1));
            BillingOrderItemEntity.add(
                    order,
                    BillingOrderItemEntity.Type.ADJUSTMENT,
                    null,
                    null,
                    "Paquete",
                    1,
                    TOTAL_CENTS,
                    true,
                    BigDecimal.ZERO);
            order.status = BillingOrderEntity.Status.PAID;
            order.paidAt = paidAt;
            if (withPayment) {
                PaymentTransactionEntity payment = new PaymentTransactionEntity();
                payment.id = Ids.newId();
                payment.orderId = order.id;
                payment.provider = PaymentTransactionEntity.Provider.WOMPI;
                payment.providerTransactionId = "12239576-" + order.id;
                payment.status = PaymentTransactionEntity.Status.APPROVED;
                payment.amountCents = TOTAL_CENTS;
                payment.currency = "COP";
                payment.paymentMethodType = "CARD";
                payment.raw = "{}";
                payment.providerCreatedAt = paidAt;
                payment.finalizedAt = paidAt;
                payment.persist();
            }
            return order.id;
        });
    }

    private static UUID debt(UUID accountId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            BillingOrderEntity order = order(accountId, BillingOrderEntity.Kind.DEBT, null);
            BillingOrderItemEntity.add(
                    order,
                    BillingOrderItemEntity.Type.ADJUSTMENT,
                    null,
                    null,
                    "Documentos usados",
                    1,
                    500_000,
                    true,
                    BigDecimal.ZERO);
            return order.id;
        });
    }

    /** A Wompi refund of the order sent and never answered. */
    private static UUID submitted(UUID orderId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            BillingOrderEntity order = BillingOrderEntity.findById(orderId);
            PaymentReversalEntity reversal = PaymentReversalEntity.request(
                    order,
                    PaymentReversalEntity.Kind.REFUND,
                    PaymentReversalEntity.Mode.WOMPI,
                    1_000_000,
                    "12239576-" + order.id,
                    Actor.system(),
                    "Pedido por el cliente");
            reversal.status = PaymentReversalEntity.Status.SUBMITTED;
            return reversal.id;
        });
    }

    private static BillingOrderEntity order(UUID accountId, BillingOrderEntity.Kind kind, OffsetDateTime expiresAt) {
        BillingOrderEntity order = new BillingOrderEntity();
        order.id = Ids.newId();
        order.accountId = accountId;
        order.kind = kind;
        order.status = BillingOrderEntity.Status.PENDING;
        order.reference = BillingOrderEntity.reference();
        order.currency = BillingOrderEntity.CURRENCY;
        order.billingProfile = new Party(
                null, null, "900123456", "8", "Reversos SAS", null, List.of(), null, null, null, "f@r.test", null);
        order.expiresAt = expiresAt;
        order.persist();
        return order;
    }

    private static Map<String, Object> refund(long amountCents, String mode) {
        return Map.of("amountCents", amountCents, "mode", mode, "reason", "Pedido por el cliente");
    }

    private static Response buy(ConsoleUser owner, String planVersionId) {
        return owner.request().body(Map.of("planVersionId", planVersionId)).post("/console/orders");
    }

    private static String path(UUID accountId, String rest) {
        return "/admin/accounts/" + accountId + "/orders" + rest;
    }

    private static List<JobEntity> jobs(String type, UUID referenceId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> JobEntity.<JobEntity>list("jobType = ?1 and referenceId = ?2", type, referenceId));
    }
}
