package com.cantte.cetus.api.billing;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.api.admin.PlatformRoles;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.PaymentReversalEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** The yearly income of the paid orders against the VAT threshold of the test profile (3,500 UVT of $50,000). */
@QuarkusTest
class RevenueTest {

    private static final ConsoleUser SUPPORT = ConsoleUser.platformStaff(PlatformRoles.SUPPORT);

    /** A year no other test pays orders in. */
    private static final int YEAR = 2099;

    @Test
    void theYearCountsPaidOrdersInColombiaTimeAgainstTheThreshold() {
        UUID account = account();
        // 70 % of the $175,000,000 threshold, in two orders; the second at the last hour of the year in Colombia.
        order(
                account,
                BillingOrderEntity.Status.PAID,
                10_000_000_000L,
                OffsetDateTime.parse("2099-06-01T12:00:00-05:00"));
        order(
                account,
                BillingOrderEntity.Status.PAID,
                2_251_000_000L,
                OffsetDateTime.parse("2099-12-31T23:30:00-05:00"));
        UUID refunded = order(
                account,
                BillingOrderEntity.Status.REFUNDED,
                5_000_000_000L,
                OffsetDateTime.parse("2099-03-01T12:00:00-05:00"));
        reverse(refunded, 5_000_000_000L, OffsetDateTime.parse("2099-03-02T12:00:00-05:00"));
        // Paid the year before and partly refunded in this one: the refund lowers this year's income.
        UUID previous = order(
                account, BillingOrderEntity.Status.PAID, 2_000_000L, OffsetDateTime.parse("2098-12-31T22:00:00-05:00"));
        reverse(previous, 1_000_000L, OffsetDateTime.parse("2099-01-10T12:00:00-05:00"));

        JsonPath revenue = SUPPORT.request()
                .get("/admin/billing/revenue?year=" + YEAR)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();

        assertThat(revenue.getInt("year")).isEqualTo(YEAR);
        assertThat(revenue.getLong("revenueCents")).isEqualTo(12_250_000_000L);
        assertThat(revenue.getLong("thresholdCents")).isEqualTo(17_500_000_000L);
        assertThat(revenue.getLong("uvtValueCop")).isEqualTo(50_000);
        assertThat(revenue.getInt("thresholdUvt")).isEqualTo(3_500);
        assertThat(revenue.getDouble("thresholdPercent")).isEqualTo(70.0);
        assertThat(revenue.getList("alertPercentsReached", Integer.class)).containsExactly(70);
        assertThat(SUPPORT.request()
                        .get("/admin/billing/revenue?year=2098")
                        .then()
                        .statusCode(200)
                        .extract()
                        .jsonPath()
                        .getLong("revenueCents"))
                .isGreaterThanOrEqualTo(2_000_000L);
    }

    @Test
    void onlyThePlatformTeamSeesIt() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Curiosa de Ingresos SAS");

        owner.request().get("/admin/billing/revenue").then().statusCode(403);
        SUPPORT.request().get("/admin/billing/revenue").then().statusCode(200);
        SUPPORT.request().get("/admin/billing/revenue?year=1990").then().statusCode(400);
    }

    private static UUID account() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Ingresos SAS");
        return UUID.fromString(
                owner.request().get("/console/account").then().extract().path("id"));
    }

    private static void reverse(UUID orderId, long amountCents, OffsetDateTime approvedAt) {
        QuarkusTransaction.requiringNew().run(() -> {
            BillingOrderEntity order = BillingOrderEntity.findById(orderId);
            PaymentReversalEntity reversal = PaymentReversalEntity.request(
                    order,
                    PaymentReversalEntity.Kind.REFUND,
                    PaymentReversalEntity.Mode.EXTERNAL,
                    amountCents,
                    null,
                    Actor.system(),
                    "Devolución");
            reversal.status = PaymentReversalEntity.Status.APPROVED;
            reversal.approvedAt = approvedAt;
        });
    }

    private static UUID order(
            UUID accountId, BillingOrderEntity.Status status, long totalCents, OffsetDateTime paidAt) {
        return QuarkusTransaction.requiringNew().call(() -> {
            BillingOrderEntity order = new BillingOrderEntity();
            order.id = Ids.newId();
            order.accountId = accountId;
            order.kind = BillingOrderEntity.Kind.PURCHASE;
            order.status = status;
            order.reference = "CET-TEST-" + order.id;
            order.subtotalCents = totalCents;
            order.totalCents = totalCents;
            order.currency = "COP";
            order.billingProfile = new Party(
                    null, null, "900123456", "8", "Ingresos SAS", null, List.of(), null, null, null, "f@i.test", null);
            order.expiresAt = paidAt.plusDays(1);
            order.paidAt = paidAt;
            order.persist();
            return order.id;
        });
    }
}
