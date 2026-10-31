package com.cantte.cetus.worker.billing;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.payments.PaymentStatus;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.CreditMovementEntity;
import com.cantte.cetus.persistence.entity.CreditReservationEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.worker.billing.PaymentSettlement.Outcome;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** A paid order grants its credits once, and its lot first pays the grace documents already accepted. */
@QuarkusTest
class OrderCreditsTest {

    @Inject
    WorkerFixtures fixtures;

    @Inject
    PaymentSettlement settlement;

    @Inject
    CreditLedger ledger;

    @Test
    void aPaidPackageGrantsItsDocumentsForItsValidityOnce() {
        UUID accountId = accountOf(fixtures.invoice());
        BillingOrderEntity order = fixtures.planOrder(accountId, "EMPRENDEDOR");
        PaymentTransaction payment = approved(order);

        assertThat(settlement.apply(payment)).isEqualTo(Outcome.PAID);
        assertThat(settlement.apply(payment)).isEqualTo(Outcome.ALREADY_PAID);

        List<CreditGrantEntity> lots = lotsOf(accountId);
        assertThat(lots).hasSize(1);
        CreditGrantEntity lot = lots.getFirst();
        BillingOrderEntity paid = QuarkusTransaction.requiringNew().call(() -> BillingOrderEntity.findById(order.id));
        assertThat(lot.quantity).isEqualTo(300);
        assertThat(lot.remaining).isEqualTo(300);
        assertThat(lot.status).isEqualTo(CreditGrantEntity.Status.ACTIVE);
        assertThat(lot.sourceType).isEqualTo(CreditGrantEntity.SourceType.ORDER_ITEM);
        assertThat(lot.expiresAt.toInstant())
                .isEqualTo(paid.paidAt.plusMonths(12).toInstant());
        assertThat(movementsOf(accountId)).extracting(m -> m.type).containsExactly(CreditMovementEntity.Type.GRANT);
    }

    @Test
    void aTopUpFirstPaysTheAcceptedGraceDocumentsAndAPendingOneOnceAccepted() {
        UUID first = fixtures.invoice();
        UUID accountId = accountOf(first);
        UUID accepted = fixtures.invoiceFor(accountId);
        UUID pending = fixtures.invoiceFor(accountId);
        QuarkusTransaction.requiringNew().run(() -> {
            ledger.grant(
                    accountId,
                    new CreditLedger.Source(CreditGrantEntity.SourceType.PROMO, Ids.newId()),
                    currentVersion("EMPRENDEDOR").id,
                    1,
                    OffsetDateTime.now().plusMonths(12),
                    Actor.system(),
                    null);
            OffsetDateTime now = OffsetDateTime.now();
            assertThat(ledger.reserve(accountId, first, DocumentType.INVOICE, now).kind)
                    .isEqualTo(CreditReservationEntity.Kind.CREDIT);
            assertThat(ledger.reserve(accountId, accepted, DocumentType.INVOICE, now).kind)
                    .isEqualTo(CreditReservationEntity.Kind.GRACE);
            assertThat(ledger.reserve(accountId, pending, DocumentType.INVOICE, now).kind)
                    .isEqualTo(CreditReservationEntity.Kind.GRACE);
            ledger.confirm(accepted, now);
        });

        BillingOrderEntity order = fixtures.planOrder(accountId, "RECARGA_100");
        assertThat(settlement.apply(approved(order))).isEqualTo(Outcome.PAID);

        CreditGrantEntity topUp = lotsOf(accountId).getFirst();
        assertThat(topUp.remaining).isEqualTo(99);
        assertThat(reservationOf(accepted).settled).isTrue();
        assertThat(reservationOf(pending).settled).isFalse();

        QuarkusTransaction.requiringNew().run(() -> ledger.confirm(pending, OffsetDateTime.now()));

        assertThat(reservationOf(pending).settled).isTrue();
        assertThat(lotsOf(accountId).getFirst().remaining).isEqualTo(98);
        assertThat(sumOfMovements(topUp.id)).isEqualTo(98);
    }

    private static PaymentTransaction approved(BillingOrderEntity order) {
        Instant now = Instant.now();
        return new PaymentTransaction(
                "12239576-" + order.id,
                order.reference,
                PaymentStatus.APPROVED,
                order.totalCents,
                "COP",
                "CARD",
                Optional.empty(),
                now,
                Optional.of(now),
                "{}");
    }

    private static UUID accountOf(UUID documentId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(documentId).accountId);
    }

    private static PlanVersionEntity currentVersion(String planCode) {
        return PlanVersionEntity.findCurrent(PlanEntity.byCode(planCode).id, null, OffsetDateTime.now())
                .orElseThrow();
    }

    private static List<CreditGrantEntity> lotsOf(UUID accountId) {
        return QuarkusTransaction.requiringNew().call(() -> CreditGrantEntity.listByAccount(accountId));
    }

    private static List<CreditMovementEntity> movementsOf(UUID accountId) {
        return QuarkusTransaction.requiringNew().call(() -> CreditMovementEntity.listByAccount(accountId, 100));
    }

    private static CreditReservationEntity reservationOf(UUID documentId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> CreditReservationEntity.listByDocument(documentId).getFirst());
    }

    private static long sumOfMovements(UUID grantId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) CreditMovementEntity.getEntityManager()
                                .createNativeQuery(
                                        "SELECT sum(quantity) FROM billing.credit_movements WHERE grant_id = :id")
                                .setParameter("id", grantId)
                                .getSingleResult())
                        .longValue());
    }
}
