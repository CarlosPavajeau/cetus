package com.cantte.cetus.worker.batches;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.PaymentInfo;
import com.cantte.cetus.domain.model.TaxType;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.DocumentBatchEntity;
import com.cantte.cetus.persistence.entity.DocumentBatchItemEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.worker.support.NotificationRecorder;
import com.cantte.cetus.worker.support.ResultRecorder;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;

@QuarkusTest
class BatchExpansionTest {

    @Inject
    ExpandBatchHandler handler;

    @Inject
    BatchExpansion expansion;

    @Inject
    BatchUpkeep upkeep;

    @Inject
    ResultRecorder recorder;

    @Inject
    WorkerFixtures fixtures;

    @Inject
    CreditLedger ledger;

    @Inject
    NotificationRecorder notifications;

    @Test
    void theDocumentsFollowThePositionsAndARunAgainDuplicatesNone() {
        Batch batch = batch(Environment.TEST, 150);

        handler.handle(job(batch.id()));
        handler.handle(job(batch.id()));

        List<DocumentEntity> documents = documents(batch.id());
        assertThat(documents).hasSize(150);
        assertThat(documents.stream().map(doc -> doc.batchPosition).toList())
                .isEqualTo(LongStream.range(0, 150).mapToObj(i -> (int) i).toList());
        assertConsecutive(documents);
        assertThat(documents.getFirst().externalReference).isEqualTo("REF-0");
        assertThat(documents.getFirst().customer.legalName()).isEqualTo("OPTICAS GMO COLOMBIA S A S");
        assertThat(documents.getFirst().payableAmount).isEqualByComparingTo(new BigDecimal("119000"));
        assertThat(jobs(JobTypes.PROCESS_BATCH_DOCUMENT, documents)).isEqualTo(150);
        DocumentBatchEntity stored = find(batch.id());
        assertThat(stored.status).isEqualTo(DocumentBatchEntity.Status.PROCESSING);
        assertThat(stored.expandedAt).isNotNull();
        assertThat(pendingPayloads(batch.id())).isZero();
    }

    @Test
    void anInterruptedExpansionGoesOnWhereItStoppedAndSingleInvoicesTakeNumbersBetweenBlocks() {
        Batch batch = batch(Environment.TEST, 150);
        assertThat(expansion.start(batch.id())).isTrue();
        assertThat(expansion.block(batch.id())).isEqualTo(BatchExpansion.BLOCK);

        long single = singleInvoiceNumber(batch.issuerId());
        handler.handle(job(batch.id()));

        List<DocumentEntity> documents = documents(batch.id());
        assertThat(documents).hasSize(150);
        assertThat(documents.get(99).number + 1).isEqualTo(single);
        assertThat(documents.get(100).number).isEqualTo(single + 1);
        assertConsecutive(documents.subList(0, 100));
        assertConsecutive(documents.subList(100, 150));
    }

    @Test
    void runningOutOfCreditsIssuesWhatTheCreditsCoverWithoutGapsAndClosesTheBatchAsPartial() {
        Batch batch = batch(Environment.LIVE, 250);
        grant(batch.accountId(), 150);
        long capacity =
                QuarkusTransaction.requiringNew().call(() -> ledger.capacity(batch.accountId(), OffsetDateTime.now()));

        handler.handle(job(batch.id()));

        List<DocumentEntity> documents = documents(batch.id());
        assertThat(capacity).isBetween(150L, 249L);
        assertThat(documents).hasSize((int) capacity);
        assertConsecutive(documents);
        assertThat(nextNumber(batch.issuerId())).isEqualTo(documents.getLast().number + 1);
        assertThat(pendingPayloads(batch.id())).isZero();
        DocumentBatchEntity stopped = find(batch.id());
        assertThat(stopped.status).isEqualTo(DocumentBatchEntity.Status.PROCESSING);
        assertThat(stopped.stopReason).isEqualTo("insufficient_credits");

        documents.forEach(doc -> recorder.gaveUp(doc.id, "Prueba"));
        assertThat(find(batch.id()).status).isEqualTo(DocumentBatchEntity.Status.PARTIAL);
    }

    @Test
    void aRangeWaitingForItsTechnicalKeyLeavesTheBatchForTheJobToRetry() {
        Batch batch = batch(Environment.LIVE, 2);
        grant(batch.accountId(), 2);
        UUID rangeId = range(batch.issuerId()).id;
        byte[] key = range(batch.issuerId()).technicalKeySealed;
        QuarkusTransaction.requiringNew()
                .run(() -> NumberingRangeEntity.<NumberingRangeEntity>findById(rangeId).technicalKeySealed = null);

        assertThatThrownBy(() -> handler.handle(job(batch.id())))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "technical_key_pending");
        assertThat(find(batch.id()).status).isEqualTo(DocumentBatchEntity.Status.EXPANDING);
        assertThat(pendingPayloads(batch.id())).isEqualTo(2);

        QuarkusTransaction.requiringNew()
                .run(() -> NumberingRangeEntity.<NumberingRangeEntity>findById(rangeId).technicalKeySealed = key);
        handler.handle(job(batch.id()));
        assertThat(documents(batch.id())).hasSize(2);
    }

    @Test
    void aRangeLeftActiveWithoutNumbersStopsTheBatchInsteadOfCompletingIt() {
        Batch batch = batch(Environment.TEST, 2);
        UUID rangeId = range(batch.issuerId()).id;
        QuarkusTransaction.requiringNew().run(() -> {
            NumberingRangeEntity range = NumberingRangeEntity.findById(rangeId);
            range.nextNumber = range.rangeTo + 1;
        });

        handler.handle(job(batch.id()));

        DocumentBatchEntity stopped = find(batch.id());
        assertThat(stopped.status).isEqualTo(DocumentBatchEntity.Status.FAILED);
        assertThat(stopped.stopReason).isEqualTo("no_active_numbering_range");
        assertThat(pendingPayloads(batch.id())).isZero();
    }

    @Test
    void theBatchCompletesWhenItsLastDocumentFinishesAndTellsWhoSentIt() {
        Batch batch = batch(Environment.TEST, 3);
        handler.handle(job(batch.id()));
        List<DocumentEntity> documents = documents(batch.id());

        recorder.gaveUp(documents.get(0).id, "Prueba");
        recorder.gaveUp(documents.get(1).id, "Prueba");
        assertThat(find(batch.id()).status).isEqualTo(DocumentBatchEntity.Status.PROCESSING);
        recorder.gaveUp(documents.get(2).id, "Prueba");

        DocumentBatchEntity closed = find(batch.id());
        assertThat(closed.status).isEqualTo(DocumentBatchEntity.Status.COMPLETED);
        assertThat(closed.completedAt).isNotNull();
        NotificationEntity notice = QuarkusTransaction.requiringNew()
                .call(() -> NotificationEntity.<NotificationEntity>find(
                                "accountId = ?1 and kind = ?2",
                                batch.accountId(),
                                NotificationKind.BATCH_FINISHED.name())
                        .singleResult());
        assertThat(notice.data).containsEntry("email", "lotes@cetus.test").containsEntry("failed", "3");
        assertThat(notifications.load(notice.id).orElseThrow().recipients()).containsExactly("lotes@cetus.test");

        QuarkusTransaction.requiringNew().run(() -> DocumentBatchEntity.forgetSender(batch.accountId(), "user_test"));
        assertThat(notifications.load(notice.id).orElseThrow().recipients()).isEmpty();
    }

    @Test
    void anExpansionThatDiesClosesTheBatchWithTheDocumentsItCreated() {
        Batch empty = batch(Environment.TEST, 2);
        handler.onDead(job(empty.id()), "boom");
        assertThat(find(empty.id()).status).isEqualTo(DocumentBatchEntity.Status.FAILED);
        assertThat(find(empty.id()).stopReason).isEqualTo(ExpandBatchHandler.EXPANSION_FAILED);
        assertThat(pendingPayloads(empty.id())).isZero();

        Batch half = batch(Environment.TEST, 150);
        expansion.start(half.id());
        expansion.block(half.id());
        handler.onDead(job(half.id()), "boom");
        List<DocumentEntity> documents = documents(half.id());
        assertThat(documents).hasSize(100);
        documents.forEach(doc -> recorder.gaveUp(doc.id, "Prueba"));
        assertThat(find(half.id()).status).isEqualTo(DocumentBatchEntity.Status.PARTIAL);
    }

    @Test
    void aPageOfBatchesIsCountedBatchByBatch() {
        Batch three = batch(Environment.TEST, 3);
        Batch two = batch(Environment.TEST, 2);
        handler.handle(job(three.id()));
        expansion.start(two.id());
        recorder.gaveUp(documents(three.id()).getFirst().id, "Prueba");

        var counts = QuarkusTransaction.requiringNew()
                .call(() -> DocumentBatchEntity.countsOf(List.of(find(three.id()), find(two.id()))));

        assertThat(counts.get(three.id())).isEqualTo(new DocumentBatchEntity.Counts(0, 0, 1, 2, 0));
        assertThat(counts.get(two.id())).isEqualTo(new DocumentBatchEntity.Counts(0, 0, 0, 0, 2));
    }

    @Test
    void theUpkeepClosesABatchWhoseClosingWasLost() {
        Batch batch = batch(Environment.TEST, 2);
        handler.handle(job(batch.id()));
        QuarkusTransaction.requiringNew()
                .run(() ->
                        DocumentEntity.update("status = ?1 where batchId = ?2", DocumentStatus.ACCEPTED, batch.id()));

        assertThat(upkeep.check()).contains(batch.id());
        assertThat(find(batch.id()).status).isEqualTo(DocumentBatchEntity.Status.COMPLETED);
    }

    private record Batch(UUID id, UUID accountId, UUID issuerId) {}

    /** A batch as the API leaves it: received, with its items, from an issuer of the environment. */
    private Batch batch(Environment environment, int items) {
        UUID seeded = fixtures.invoice();
        return QuarkusTransaction.requiringNew().call(() -> {
            DocumentEntity doc = DocumentEntity.findById(seeded);
            IssuerEntity issuer = IssuerEntity.findById(doc.issuerId);
            issuer.environment = environment;
            issuer.status = IssuerEntity.Status.ENABLED;
            DocumentBatchEntity batch = new DocumentBatchEntity();
            batch.id = Ids.newId();
            batch.accountId = doc.accountId;
            batch.issuerId = issuer.id;
            batch.environment = environment;
            batch.source = DocumentBatchEntity.Source.CONSOLE;
            batch.items = items;
            batch.createdBy = "user_test";
            batch.createdByEmail = "lotes@cetus.test";
            batch.persistAndFlush();
            for (int position = 0; position < items; position++) {
                DocumentBatchItemEntity item = new DocumentBatchItemEntity();
                item.batchId = batch.id;
                item.position = position;
                item.reference = "REF-" + position;
                item.payload = new DocumentBatchItemEntity.Payload(
                        doc.customer,
                        new PaymentInfo("1", "10", null),
                        null,
                        "COP",
                        List.of(new LineInput(
                                "REF-" + position + "-1",
                                "Arriendo",
                                BigDecimal.ONE,
                                "94",
                                new BigDecimal("100000"),
                                List.of(new LineInput.LineTax(TaxType.IVA, new BigDecimal("19"))))),
                        List.of(),
                        "{}");
                item.persist();
            }
            return new Batch(batch.id, doc.accountId, issuer.id);
        });
    }

    /** An EXPAND_BATCH job as the claimer hands it over. */
    private static JobEntity job(UUID batchId) {
        JobEntity job = new JobEntity();
        job.id = Ids.newId();
        job.jobType = JobTypes.EXPAND_BATCH;
        job.referenceId = batchId;
        job.attempts = 1;
        return job;
    }

    /** Numbered as the API numbers a single invoice: the range locked in its own transaction. */
    private static long singleInvoiceNumber(UUID issuerId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            IssuerEntity issuer = IssuerEntity.findById(issuerId);
            NumberingRangeEntity range = DocumentEntity.lockRange(
                    issuer, issuer.environment, DocumentType.INVOICE, LocalDate.now(DianTime.ZONE));
            DocumentEntity doc = DocumentEntity.draft(
                    issuer.accountId,
                    issuer,
                    issuer.environment,
                    range,
                    WorkerFixtures.calculation(),
                    ZonedDateTime.now(DianTime.ZONE));
            doc.customer =
                    DocumentEntity.<DocumentEntity>find("issuerId", issuerId).firstResult().customer;
            doc.payment = new PaymentInfo("1", "10", null);
            doc.requestPayload = "{}";
            doc.persist();
            return doc.number;
        });
    }

    private void grant(UUID accountId, int quantity) {
        QuarkusTransaction.requiringNew()
                .run(() -> ledger.grant(
                        accountId,
                        new CreditLedger.Source(CreditGrantEntity.SourceType.PROMO, Ids.newId()),
                        PlanVersionEntity.findCurrent(PlanEntity.byCode("EMPRENDEDOR").id, null, OffsetDateTime.now())
                                .orElseThrow()
                                .id,
                        quantity,
                        OffsetDateTime.now().plusMonths(1),
                        Actor.system(),
                        null));
    }

    private static void assertConsecutive(List<DocumentEntity> documents) {
        for (int i = 1; i < documents.size(); i++) {
            assertThat(documents.get(i).number).isEqualTo(documents.get(i - 1).number + 1);
        }
    }

    private static List<DocumentEntity> documents(UUID batchId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>list("batchId = ?1 order by batchPosition", batchId));
    }

    private static DocumentBatchEntity find(UUID batchId) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentBatchEntity.findById(batchId));
    }

    private static long pendingPayloads(UUID batchId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentBatchItemEntity.count("batchId = ?1 and payload is not null", batchId));
    }

    private static long nextNumber(UUID issuerId) {
        return range(issuerId).nextNumber;
    }

    private static NumberingRangeEntity range(UUID issuerId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> NumberingRangeEntity.<NumberingRangeEntity>find(
                                "issuerId = ?1 and documentType = ?2", issuerId, DocumentType.INVOICE)
                        .singleResult());
    }

    private static long jobs(String type, List<DocumentEntity> documents) {
        return QuarkusTransaction.requiringNew()
                .call(() -> JobEntity.count(
                        "jobType = ?1 and referenceId in ?2",
                        type,
                        documents.stream().map(doc -> doc.id).toList()));
    }
}
