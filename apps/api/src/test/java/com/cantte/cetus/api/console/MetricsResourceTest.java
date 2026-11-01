package com.cantte.cetus.api.console;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.metrics.MetricsViews.AlertsView;
import com.cantte.cetus.api.metrics.MetricsViews.AmountView;
import com.cantte.cetus.api.metrics.MetricsViews.MetricsView;
import com.cantte.cetus.api.metrics.MetricsViews.RangeAlertView;
import com.cantte.cetus.api.metrics.MetricsViews.StatusCountsView;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.IssuedDocuments;
import com.cantte.cetus.api.support.IssuedDocuments.Issuer;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.dian.DocumentDianRules;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.SigningCertificateEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;

@QuarkusTest
class MetricsResourceTest {

    @Inject
    DocumentDianRules dianRules;

    @Test
    void countsThePeriodsDocumentsByDayAndOutcome() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        Issuer issuer = IssuedDocuments.issuer(customer, "Metricas SAS");
        LocalDate today = LocalDate.now(DianTime.ZONE);
        UUID accepted = IssuedDocuments.invoice(issuer);
        UUID rejected = IssuedDocuments.invoice(issuer);
        UUID failed = IssuedDocuments.invoice(issuer);
        IssuedDocuments.invoice(issuer);
        UUID credited = IssuedDocuments.invoice(issuer);
        UUID before = IssuedDocuments.invoice(issuer);
        verdict(accepted, DocumentStatus.ACCEPTED, 10);
        verdict(rejected, DocumentStatus.REJECTED, 30);
        update(failed, doc -> {
            doc.status = DocumentStatus.FAILED;
            doc.issueDate = today.minusDays(1);
        });
        verdict(credited, DocumentStatus.ACCEPTED, 20);
        update(credited, doc -> {
            doc.documentType = DocumentType.CREDIT_NOTE;
            doc.payableAmount = new BigDecimal("19000.00");
        });
        verdict(before, DocumentStatus.ACCEPTED, 5);
        update(before, doc -> doc.issueDate = today.minusDays(7));
        rule(accepted, "Regla: FAJ43b, Notificación: Nombre informado No corresponde");
        rule(rejected, "Regla: FAJ43b, Notificación: Nombre informado No corresponde");
        rule(rejected, "Regla: FAK26, Rechazo: Responsabilidad informada no valida");
        rule(before, "Regla: FAB10a, Rechazo: Fuera del periodo");

        MetricsView metrics = metrics(customer, Environment.TEST, today.minusDays(6), today);

        assertThat(metrics.totals()).isEqualTo(new StatusCountsView(2, 1, 1, 1, 5));
        assertThat(metrics.acceptanceRate()).isCloseTo(2.0 / 3, within(1e-9));
        assertThat(metrics.days()).hasSize(7);
        assertThat(metrics.days().getFirst().date()).isEqualTo(today.minusDays(6));
        assertThat(metrics.days().getFirst().documents()).isEqualTo(new StatusCountsView(0, 0, 0, 0, 0));
        assertThat(metrics.days().get(5).documents()).isEqualTo(new StatusCountsView(0, 0, 1, 0, 1));
        assertThat(metrics.days().getLast().documents()).isEqualTo(new StatusCountsView(2, 1, 0, 1, 4));
        assertThat(metrics.amounts())
                .singleElement()
                .usingRecursiveComparison()
                .withComparatorForType(BigDecimal::compareTo, BigDecimal.class)
                .isEqualTo(new AmountView(
                        "COP",
                        new BigDecimal("119000"),
                        BigDecimal.ZERO,
                        new BigDecimal("19000"),
                        new BigDecimal("100000")));
        assertThat(metrics.validation().documents()).isEqualTo(3);
        assertThat(metrics.validation().secondsAverage()).isCloseTo(20.0, within(0.01));
        assertThat(metrics.validation().secondsP95()).isCloseTo(29.0, within(0.01));
        assertThat(metrics.rules())
                .extracting(r -> r.rule() + ":" + r.kind() + ":" + r.documents())
                .containsExactly("FAJ43b:NOTIFICATION:2", "FAK26:REJECTION:1");
    }

    @Test
    void readsOnlyTheEnvironmentAndTheAccountAsked() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        Issuer issuer = IssuedDocuments.issuer(customer, "Ambientes SAS");
        LocalDate today = LocalDate.now(DianTime.ZONE);
        UUID live = IssuedDocuments.invoice(issuer);
        IssuedDocuments.invoice(issuer);
        update(live, doc -> doc.environment = Environment.LIVE);
        ConsoleUser other = ConsoleUser.newOrganization();
        IssuedDocuments.issuer(other, "Otra SAS");

        assertThat(metrics(customer, Environment.TEST, today, today).totals().total())
                .isEqualTo(1);
        assertThat(metrics(customer, Environment.LIVE, today, today).totals().total())
                .isEqualTo(1);
        assertThat(metrics(other, Environment.TEST, today, today).totals().total())
                .isZero();
    }

    @Test
    void aPeriodWithoutVerdictsHasNoRateOrTimes() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        IssuedDocuments.issuer(customer, "Vacia SAS");
        LocalDate today = LocalDate.now(DianTime.ZONE);

        MetricsView metrics = metrics(customer, Environment.TEST, today.minusDays(29), today);

        assertThat(metrics.days())
                .hasSize(30)
                .allSatisfy(day -> assertThat(day.documents().total()).isZero());
        assertThat(metrics.acceptanceRate()).isNull();
        assertThat(metrics.validation().documents()).isZero();
        assertThat(metrics.validation().secondsAverage()).isNull();
        assertThat(metrics.validation().secondsP95()).isNull();
        assertThat(metrics.amounts()).isEmpty();
        assertThat(metrics.rules()).isEmpty();
    }

    @Test
    void refusesAPeriodBackwardsOrLongerThanAYear() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        IssuedDocuments.issuer(customer, "Periodos SAS");
        LocalDate today = LocalDate.now(DianTime.ZONE);

        customer.request()
                .queryParam("environment", "TEST")
                .queryParam("from", today.toString())
                .queryParam("to", today.minusDays(1).toString())
                .get("/console/metrics")
                .then()
                .statusCode(400)
                .body("code", equalTo("invalid_period"));
        customer.request()
                .queryParam("environment", "TEST")
                .queryParam("from", today.minusDays(366).toString())
                .queryParam("to", today.toString())
                .get("/console/metrics")
                .then()
                .statusCode(400)
                .body("code", equalTo("invalid_period"));
        customer.request()
                .queryParam("from", today.toString())
                .queryParam("to", today.toString())
                .get("/console/metrics")
                .then()
                .statusCode(400)
                .body("code", equalTo("invalid_request"));
        assertThat(metrics(customer, Environment.TEST, today.minusDays(365), today)
                        .days())
                .hasSize(366);
    }

    @Test
    void alertsOfACertificateAboutToExpireAndARangeMostlyUsed() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        Issuer issuer = IssuedDocuments.issuer(customer, "Avisos SAS");
        UUID issuerId = UUID.fromString(issuer.id());
        QuarkusTransaction.requiringNew().run(() -> {
            SigningCertificateEntity.findActive(issuerId).orElseThrow().validTo =
                    OffsetDateTime.now().plusDays(7);
            NumberingRangeEntity range = NumberingRangeEntity.<NumberingRangeEntity>list("issuerId", issuerId)
                    .getFirst();
            range.nextNumber = range.rangeFrom + (range.rangeTo - range.rangeFrom + 1) * 85 / 100;
            range.validTo = LocalDate.now(DianTime.ZONE).plusDays(10);
        });

        AlertsView alerts = customer.request()
                .queryParam("environment", "TEST")
                .get("/console/alerts")
                .then()
                .statusCode(200)
                .extract()
                .as(AlertsView.class);

        assertThat(alerts.certificates()).singleElement().satisfies(certificate -> {
            assertThat(certificate.issuerId()).isEqualTo(issuerId);
            assertThat(certificate.daysLeft()).isBetween(6L, 7L);
        });
        assertThat(alerts.ranges())
                .singleElement()
                .extracting(
                        RangeAlertView::issuerId,
                        RangeAlertView::documentType,
                        RangeAlertView::daysLeft,
                        RangeAlertView::runningOut,
                        RangeAlertView::expiring)
                .containsExactly(issuerId, DocumentType.INVOICE, 10L, true, true);
        assertThat(customer.request()
                        .queryParam("environment", "SANDBOX")
                        .get("/console/alerts")
                        .then()
                        .statusCode(200)
                        .extract()
                        .as(AlertsView.class))
                .isEqualTo(new AlertsView(List.of(), List.of()));
    }

    @Test
    void aRangeWithRoomAndALongResolutionIsNoWarning() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        IssuedDocuments.issuer(customer, "Tranquila SAS");

        AlertsView alerts = customer.request()
                .queryParam("environment", "TEST")
                .get("/console/alerts")
                .then()
                .statusCode(200)
                .extract()
                .as(AlertsView.class);

        assertThat(alerts.ranges()).singleElement().satisfies(range -> {
            assertThat(range.used()).isZero();
            assertThat(range.total()).isEqualTo(5_000_001);
            assertThat(range.runningOut()).isFalse();
            assertThat(range.expiring()).isFalse();
        });
    }

    private static MetricsView metrics(ConsoleUser user, Environment environment, LocalDate from, LocalDate to) {
        return user.request()
                .queryParam("environment", environment.name())
                .queryParam("from", from.toString())
                .queryParam("to", to.toString())
                .get("/console/metrics")
                .then()
                .statusCode(200)
                .extract()
                .as(MetricsView.class);
    }

    private static void verdict(UUID documentId, DocumentStatus status, int seconds) {
        update(documentId, doc -> {
            doc.status = status;
            doc.validatedAt = doc.createdAt.plusSeconds(seconds);
        });
    }

    private static void update(UUID documentId, Consumer<DocumentEntity> change) {
        QuarkusTransaction.requiringNew().run(() -> change.accept(DocumentEntity.findById(documentId)));
    }

    private void rule(UUID documentId, String error) {
        QuarkusTransaction.requiringNew().run(() -> dianRules.record(documentId, List.of(error)));
    }
}
