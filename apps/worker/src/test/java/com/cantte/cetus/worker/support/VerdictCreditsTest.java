package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.CreditMovementEntity;
import com.cantte.cetus.persistence.entity.CreditReservationEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** The DIAN's verdict confirms what a LIVE document reserved, or gives it back when it rejects the document. */
@QuarkusTest
class VerdictCreditsTest {

    private static final DianResponse ACCEPTED =
            new DianResponse(true, "00", "Procesado Correctamente.", null, List.of(), null, null, null);
    private static final DianResponse REJECTED =
            new DianResponse(false, "99", "Validación contiene errores", null, List.of("FAK26"), null, null, null);

    @Inject
    WorkerFixtures fixtures;

    @Inject
    ResultRecorder recorder;

    @Inject
    CreditLedger ledger;

    @Test
    void anAcceptedDocumentConfirmsItsCreditAndARejectedOneGivesItBack() {
        UUID accepted = live(fixtures.invoice());
        UUID accountId = accountOf(accepted);
        UUID rejected = live(fixtures.invoiceFor(accountId));
        CreditGrantEntity lot = grant(accountId, 2, OffsetDateTime.now().plusMonths(1));
        reserve(accountId, accepted, rejected);

        recorder.completed(accepted, ACCEPTED);
        recorder.completed(rejected, REJECTED);
        recorder.completed(rejected, REJECTED);

        assertThat(reservationOf(accepted).status).isEqualTo(CreditReservationEntity.Status.CONFIRMED);
        assertThat(reservationOf(rejected).status).isEqualTo(CreditReservationEntity.Status.RELEASED);
        CreditGrantEntity after = lotOf(lot.id);
        assertThat(after.remaining).isEqualTo(1);
        assertThat(after.status).isEqualTo(CreditGrantEntity.Status.ACTIVE);
        assertThat(movementsOf(rejected))
                .extracting(m -> m.type)
                .containsExactly(CreditMovementEntity.Type.RESERVE, CreditMovementEntity.Type.RELEASE);
        assertThat(sumOfMovements(lot.id)).isEqualTo(after.remaining);
    }

    @Test
    void aRejectedGraceDocumentIsNeitherSettledNorCounted() {
        UUID first = live(fixtures.invoice());
        UUID accountId = accountOf(first);
        UUID grace = live(fixtures.invoiceFor(accountId));
        grant(accountId, 1, OffsetDateTime.now().plusMonths(1));
        reserve(accountId, first, grace);

        recorder.completed(grace, REJECTED);
        grant(accountId, 5, OffsetDateTime.now().plusMonths(1));

        CreditReservationEntity released = reservationOf(grace);
        assertThat(released.kind).isEqualTo(CreditReservationEntity.Kind.GRACE);
        assertThat(released.status).isEqualTo(CreditReservationEntity.Status.RELEASED);
        assertThat(released.settled).isFalse();
    }

    @Test
    void aCreditOfAnExpiredLotExpiresAsSoonAsItIsGivenBack() {
        UUID invoice = live(fixtures.invoice());
        UUID accountId = accountOf(invoice);
        CreditGrantEntity lot = grant(accountId, 3, OffsetDateTime.now().plusMonths(1));
        reserve(accountId, invoice);
        QuarkusTransaction.requiringNew().run(() -> {
            CreditGrantEntity.<CreditGrantEntity>findById(lot.id).expiresAt =
                    OffsetDateTime.now().minusSeconds(1);
            ledger.expire(accountId, OffsetDateTime.now());
        });

        recorder.completed(invoice, REJECTED);

        CreditGrantEntity after = lotOf(lot.id);
        assertThat(after.status).isEqualTo(CreditGrantEntity.Status.EXPIRED);
        assertThat(after.remaining).isZero();
        assertThat(movementsOf(invoice))
                .extracting(m -> m.type)
                .containsExactlyInAnyOrder(
                        CreditMovementEntity.Type.RESERVE,
                        CreditMovementEntity.Type.RELEASE,
                        CreditMovementEntity.Type.EXPIRE);
        assertThat(sumOfMovements(lot.id)).isZero();
    }

    @Test
    void aDocumentWhoseJobDiesKeepsItsReservation() {
        UUID invoice = live(fixtures.invoice());
        UUID accountId = accountOf(invoice);
        grant(accountId, 1, OffsetDateTime.now().plusMonths(1));
        reserve(accountId, invoice);

        recorder.gaveUp(invoice, "La DIAN no responde");

        assertThat(reservationOf(invoice).status).isEqualTo(CreditReservationEntity.Status.RESERVED);
    }

    private CreditGrantEntity grant(UUID accountId, int quantity, OffsetDateTime expiresAt) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ledger.grant(
                                accountId,
                                new CreditLedger.Source(CreditGrantEntity.SourceType.PROMO, Ids.newId()),
                                PlanVersionEntity.findCurrent(
                                                PlanEntity.byCode("EMPRENDEDOR").id, null, OffsetDateTime.now())
                                        .orElseThrow()
                                        .id,
                                quantity,
                                expiresAt,
                                Actor.system(),
                                null)
                        .orElseThrow());
    }

    private void reserve(UUID accountId, UUID... documents) {
        QuarkusTransaction.requiringNew().run(() -> {
            for (UUID document : documents) {
                ledger.reserve(accountId, document, DocumentType.INVOICE, OffsetDateTime.now());
            }
        });
    }

    private static UUID live(UUID documentId) {
        QuarkusTransaction.requiringNew()
                .run(() -> DocumentEntity.<DocumentEntity>findById(documentId).environment = Environment.LIVE);
        return documentId;
    }

    private static UUID accountOf(UUID documentId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(documentId).accountId);
    }

    private static CreditGrantEntity lotOf(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> CreditGrantEntity.findById(id));
    }

    private static CreditReservationEntity reservationOf(UUID documentId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> CreditReservationEntity.listByDocument(documentId).getFirst());
    }

    private static List<CreditMovementEntity> movementsOf(UUID documentId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> CreditMovementEntity.<CreditMovementEntity>list(
                        "documentId = ?1 order by createdAt, id", documentId));
    }

    private static int sumOfMovements(UUID grantId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) CreditMovementEntity.getEntityManager()
                                .createNativeQuery(
                                        "SELECT sum(quantity) FROM billing.credit_movements WHERE grant_id = :id")
                                .setParameter("id", grantId)
                                .getSingleResult())
                        .intValue());
    }
}
