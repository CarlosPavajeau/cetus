package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.usage.UsagePeriod;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.usage.UsageCounters;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ResultRecorderTest {

    private static final DianResponse ACCEPTED =
            new DianResponse(true, "00", "Procesado Correctamente.", null, List.of(), null, null, null);
    private static final DianResponse REJECTED =
            new DianResponse(false, "99", "Validación contiene errores", null, List.of("FAK26"), null, null, null);

    @Inject
    ResultRecorder recorder;

    @Inject
    UsageCounters usage;

    @Inject
    WorkerFixtures fixtures;

    @Test
    void anAcceptedLiveDocumentIsBilledInItsMonth() {
        UUID id = liveDocument(fixtures.invoice());
        recorder.completed(id, ACCEPTED);
        UUID noteId = fixtures.creditNote(id);

        recorder.completed(noteId, ACCEPTED);

        assertThat(billed(id))
                .containsEntry(DocumentType.INVOICE, 1L)
                .containsEntry(DocumentType.CREDIT_NOTE, 1L)
                .containsEntry(DocumentType.DEBIT_NOTE, 0L);
    }

    @Test
    void aSecondVerdictChangesNothing() {
        UUID id = liveDocument(fixtures.invoice());

        recorder.completed(id, ACCEPTED);
        recorder.completed(id, REJECTED);
        recorder.completed(id, ACCEPTED);

        assertThat(status(id)).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(billed(id)).containsEntry(DocumentType.INVOICE, 1L);
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() ->
                                JobEntity.count("jobType = ?1 and referenceId = ?2", JobTypes.DELIVER_DOCUMENT, id)))
                .isEqualTo(1);
    }

    @Test
    void onlyAcceptedLiveDocumentsAreBilled() {
        UUID test = fixtures.invoice();
        UUID rejected = liveDocument(fixtures.invoice());

        recorder.completed(test, ACCEPTED);
        recorder.completed(rejected, REJECTED);

        assertThat(billed(test)).containsEntry(DocumentType.INVOICE, 0L);
        assertThat(billed(rejected)).containsEntry(DocumentType.INVOICE, 0L);
    }

    @Test
    void theBillingContactHearsOnceWhenTheMonthReachesEachShareOfThePlan() {
        UUID id = liveDocument(fixtures.invoice());
        UUID accountId = accountOf(id);
        String plan = assignPlanWithQuota(accountId, 5);
        count(accountId, 3);

        recorder.completed(id, ACCEPTED);
        count(accountId, 2);
        recorder.completed(fixtures.creditNote(id), ACCEPTED);
        recorder.completed(fixtures.debitNote(id), ACCEPTED);

        String period = UsagePeriod.current().toString();
        assertThat(notices(accountId))
                .extracting(notice -> notice.dedupKey)
                .containsExactlyInAnyOrder(
                        "plan_usage:%s:%s:%s:80".formatted(accountId, period, plan),
                        "plan_usage:%s:%s:%s:100".formatted(accountId, period, plan));
        assertThat(notices(accountId))
                .filteredOn(notice -> notice.dedupKey.endsWith(":80"))
                .singleElement()
                .satisfies(notice -> assertThat(notice.data)
                        .containsEntry("percent", "80")
                        .containsEntry("total", "4")
                        .containsEntry("included", "5")
                        .containsEntry("priceOverage", "$1.500"));
    }

    @Test
    void anAccountWithoutAQuotaHearsNothing() {
        UUID id = liveDocument(fixtures.invoice());

        recorder.completed(id, ACCEPTED);

        assertThat(notices(accountOf(id))).isEmpty();
    }

    @Test
    void aWriteThatStartedBeforeTheVerdictWaitsForItAndKeepsIt() throws Exception {
        UUID id = liveDocument(fixtures.invoice());
        CountDownLatch locked = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        // Another run of the job holds the document while it records the DIAN's acceptance.
        CompletableFuture<Void> verdict = CompletableFuture.runAsync(
                () -> QuarkusTransaction.requiringNew().run(() -> {
                    DocumentEntity doc = DocumentEntity.lock(id);
                    locked.countDown();
                    await(release);
                    doc.status = DocumentStatus.ACCEPTED;
                }));
        locked.await(5, TimeUnit.SECONDS);

        CompletableFuture<Void> failure = CompletableFuture.runAsync(() -> recorder.failed(id, "Connection reset"));
        Thread.sleep(300);
        assertThat(failure).isNotDone();
        release.countDown();
        verdict.get(5, TimeUnit.SECONDS);
        failure.get(5, TimeUnit.SECONDS);

        assertThat(status(id)).isEqualTo(DocumentStatus.ACCEPTED);
    }

    @Test
    void documentsOfTheSameMonthAreCountedOneAfterTheOther() throws Exception {
        UUID accountId = accountOf(fixtures.invoice());
        CountDownLatch counted = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CompletableFuture<Long> invoice = CompletableFuture.supplyAsync(() -> QuarkusTransaction.requiringNew()
                .call(() -> {
                    long total = usage.record(accountId, UsagePeriod.current(), DocumentType.INVOICE);
                    counted.countDown();
                    await(release);
                    return total;
                }));
        counted.await(5, TimeUnit.SECONDS);

        // A credit note accepted at the same time updates another row, yet reads the invoice's count.
        CompletableFuture<Long> note = CompletableFuture.supplyAsync(() -> QuarkusTransaction.requiringNew()
                .call(() -> usage.record(accountId, UsagePeriod.current(), DocumentType.CREDIT_NOTE)));
        Thread.sleep(300);
        assertThat(note).isNotDone();
        release.countDown();

        assertThat(invoice.get(5, TimeUnit.SECONDS)).isEqualTo(1);
        assertThat(note.get(5, TimeUnit.SECONDS)).isEqualTo(2);
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("The test never released the transaction");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    private static UUID accountOf(UUID documentId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(documentId).accountId);
    }

    /** A plan of its own, so its notices never collide with another test's; returns its code. */
    private static String assignPlanWithQuota(UUID accountId, int included) {
        return QuarkusTransaction.requiringNew().call(() -> {
            PlanEntity plan = new PlanEntity();
            plan.code = "TEST_" + Ids.newId();
            plan.name = "Prueba";
            plan.documentsIncluded = included;
            plan.priceOverageCop = 1500;
            plan.persist();
            AccountEntity.<AccountEntity>findById(accountId).plan = plan.code;
            return plan.code;
        });
    }

    /** Bills documents issued earlier this month. */
    private void count(UUID accountId, int documents) {
        QuarkusTransaction.requiringNew().run(() -> {
            for (int i = 0; i < documents; i++) {
                usage.record(accountId, UsagePeriod.current(), DocumentType.INVOICE);
            }
        });
    }

    private static List<NotificationEntity> notices(UUID accountId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> NotificationEntity.<NotificationEntity>list(
                        "accountId = ?1 and kind = ?2", accountId, NotificationKind.PLAN_USAGE.name()));
    }

    private static UUID liveDocument(UUID id) {
        QuarkusTransaction.requiringNew()
                .run(() -> DocumentEntity.<DocumentEntity>findById(id).environment = Environment.LIVE);
        return id;
    }

    private static DocumentStatus status(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentEntity.<DocumentEntity>findById(id).status);
    }

    /** What the document's account was billed this month; every fixture document has its own account. */
    private Map<DocumentType, Long> billed(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> {
            DocumentEntity doc = DocumentEntity.findById(id);
            return usage.byType(doc.accountId, UsagePeriod.current());
        });
    }
}
