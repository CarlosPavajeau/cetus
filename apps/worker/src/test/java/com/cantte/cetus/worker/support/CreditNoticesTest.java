package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** The billing contact hears when the credits in force run low and when the grace margin starts. */
@QuarkusTest
class CreditNoticesTest {

    private static final DianResponse ACCEPTED =
            new DianResponse(true, "00", "Procesado Correctamente.", null, List.of(), null, null, null);

    @Inject
    WorkerFixtures fixtures;

    @Inject
    ResultRecorder recorder;

    @Inject
    CreditLedger ledger;

    @Test
    void eachShareIsToldOncePerLotAndANewLotStartsAgain() {
        UUID first = live(fixtures.invoice());
        UUID accountId = accountOf(first);
        CreditGrantEntity lot = grant(accountId, 10);

        documents(accountId, first, 10).forEach(this::issue);

        assertThat(notices(accountId, NotificationKind.CREDITS_USAGE))
                .extracting(notice -> notice.dedupKey)
                .containsExactlyInAnyOrder(
                        "credits_usage:%s:%s:80".formatted(accountId, lot.id),
                        "credits_usage:%s:%s:95".formatted(accountId, lot.id));
        assertThat(notices(accountId, NotificationKind.CREDITS_USAGE))
                .filteredOn(notice -> notice.dedupKey.endsWith(":80"))
                .singleElement()
                .satisfies(notice -> assertThat(notice.data)
                        .containsEntry("percent", "80")
                        .containsEntry("available", "2")
                        .containsEntry("granted", "10"));

        CreditGrantEntity next = grant(accountId, 5);
        documents(accountId, live(fixtures.invoiceFor(accountId)), 3).forEach(this::issue);

        assertThat(notices(accountId, NotificationKind.CREDITS_USAGE))
                .extracting(notice -> notice.dedupKey)
                .contains("credits_usage:%s:%s:80".formatted(accountId, next.id))
                .hasSize(3);
    }

    @Test
    void aDocumentWithinTheGraceMarginTellsItOnce() {
        UUID paid = live(fixtures.invoice());
        UUID accountId = accountOf(paid);
        grant(accountId, 1);

        documents(accountId, paid, 3).forEach(this::issue);

        assertThat(notices(accountId, NotificationKind.CREDITS_GRACE))
                .singleElement()
                .satisfies(notice ->
                        assertThat(notice.data).containsEntry("graceUsed", "1").containsEntry("graceMargin", "10"));
    }

    @Test
    void aDocumentThatReservedNothingTellsNothingAndACreditNoteNeverStartsTheGraceMargin() {
        UUID invoice = live(fixtures.invoice());
        UUID accountId = accountOf(invoice);
        CreditGrantEntity lot = grant(accountId, 100);

        recorder.completed(invoice, ACCEPTED);

        assertThat(notices(accountId, NotificationKind.CREDITS_USAGE)).isEmpty();

        UUID note = live(fixtures.creditNote(invoice));
        QuarkusTransaction.requiringNew().run(() -> {
            ledger.adjust(accountId, -100, null, Actor.system(), "Prueba", OffsetDateTime.now());
            ledger.reserve(accountId, note, DocumentType.CREDIT_NOTE, OffsetDateTime.now());
        });
        recorder.completed(note, ACCEPTED);

        assertThat(notices(accountId, NotificationKind.CREDITS_GRACE)).isEmpty();
        assertThat(notices(accountId, NotificationKind.CREDITS_USAGE))
                .extracting(notice -> notice.dedupKey)
                .containsExactly("credits_usage:%s:%s:95".formatted(accountId, lot.id));
    }

    /** Reserves the document's credit and records the DIAN's acceptance, as one document after another would. */
    private void issue(UUID documentId) {
        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity doc = DocumentEntity.findById(documentId);
            ledger.reserve(doc.accountId, documentId, DocumentType.INVOICE, OffsetDateTime.now());
        });
        recorder.completed(documentId, ACCEPTED);
    }

    /** The first document and count − 1 more LIVE invoices of the account. */
    private List<UUID> documents(UUID accountId, UUID first, int count) {
        List<UUID> documents = new ArrayList<>(List.of(first));
        while (documents.size() < count) {
            documents.add(live(fixtures.invoiceFor(accountId)));
        }
        return documents;
    }

    private CreditGrantEntity grant(UUID accountId, int quantity) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ledger.grant(
                                accountId,
                                new CreditLedger.Source(CreditGrantEntity.SourceType.PROMO, Ids.newId()),
                                PlanVersionEntity.findCurrent(
                                                PlanEntity.byCode("EMPRENDEDOR").id, null, OffsetDateTime.now())
                                        .orElseThrow()
                                        .id,
                                quantity,
                                OffsetDateTime.now().plusMonths(1),
                                Actor.system(),
                                null)
                        .orElseThrow());
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

    private static List<NotificationEntity> notices(UUID accountId, NotificationKind kind) {
        return QuarkusTransaction.requiringNew()
                .call(() -> NotificationEntity.<NotificationEntity>list(
                        "accountId = ?1 and kind = ?2", accountId, kind.name()));
    }
}
