package com.cantte.cetus.worker.batches;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.AfterCommit;
import com.cantte.cetus.persistence.entity.DocumentBatchEntity;
import com.cantte.cetus.persistence.entity.DocumentBatchEntity.Status;
import com.cantte.cetus.persistence.entity.DocumentBatchItemEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.jboss.logging.Logger;

/**
 * The transactions of EXPAND_BATCH. Each block numbers, stores, reserves and enqueues up to {@link #BLOCK} documents
 * in one transaction, holding the issuer's range only that long, so single invoices of the issuer go between blocks.
 * A block that fails leaves nothing: its numbers go back to the range and its items keep their payload.
 */
@ApplicationScoped
public class BatchExpansion {

    private static final Logger LOG = Logger.getLogger(BatchExpansion.class);

    static final int BLOCK = 100;

    private final InvoiceCalculator calculator = new InvoiceCalculator();

    @Inject
    Clock clock;

    @Inject
    JobQueue jobs;

    @Inject
    CreditLedger credits;

    @Inject
    BatchClosure closure;

    @Inject
    AfterCommit afterCommit;

    @Inject
    MeterRegistry meters;

    /** Moves a received batch to EXPANDING; false when there is nothing to expand (it ended or stopped). */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public boolean start(UUID batchId) {
        DocumentBatchEntity batch = DocumentBatchEntity.lock(batchId).orElse(null);
        if (batch == null) {
            return false;
        }
        if (batch.status == Status.RECEIVED) {
            batch.status = Status.EXPANDING;
        }
        return batch.status == Status.EXPANDING;
    }

    /**
     * Creates the documents of the next items without one, in order of position.
     *
     * @return how many it created; 0 when no item is left
     * @throws DomainException when the issuer cannot issue or its ranges ran out
     * @throws com.cantte.cetus.credits.CreditRefused when the account ran out of credits
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public int block(UUID batchId) {
        DocumentBatchEntity batch = DocumentBatchEntity.findById(batchId);
        if (batch.status != Status.EXPANDING) {
            return 0;
        }
        List<DocumentBatchItemEntity> items = DocumentBatchItemEntity.listPending(batchId, BLOCK);
        if (items.isEmpty()) {
            return 0;
        }
        IssuerEntity issuer = IssuerEntity.findById(batch.issuerId);
        if (!canIssue(issuer)) {
            throw new DomainException("issuer_not_ready", "The issuer is not enabled to issue documents anymore");
        }
        ZonedDateTime now = ZonedDateTime.now(clock.withZone(DianTime.ZONE)).truncatedTo(ChronoUnit.SECONDS);
        NumberingRangeEntity range =
                DocumentEntity.lockRange(issuer, batch.environment, DocumentType.INVOICE, now.toLocalDate());
        if (batch.environment == Environment.LIVE) {
            // The range first, as a single invoice takes them, and both before any document references the batch:
            // whoever closes the batch holds the credits lock while it waits for the batch.
            credits.lock(batch.accountId);
        }
        int created = 0;
        for (DocumentBatchItemEntity item : items) {
            if (range.remaining() == 0) {
                // The next range waits for the next block: taking it while holding the credits would invert the order.
                break;
            }
            DocumentEntity doc = document(batch, issuer, range, item, now);
            if (batch.environment == Environment.LIVE) {
                credits.reserve(batch.accountId, doc.id, DocumentType.INVOICE, now.toOffsetDateTime());
            }
            jobs.enqueue(JobTypes.PROCESS_BATCH_DOCUMENT, doc.id, delay(batch.environment));
            item.payload = null;
            created++;
        }
        int total = created;
        String environment = batch.environment.name();
        afterCommit.run(() -> meters.counter(
                        "cetus.documents.created",
                        "document.type",
                        DocumentType.INVOICE.name(),
                        "environment",
                        environment)
                .increment(total));
        return created;
    }

    private DocumentEntity document(
            DocumentBatchEntity batch,
            IssuerEntity issuer,
            NumberingRangeEntity range,
            DocumentBatchItemEntity item,
            ZonedDateTime now) {
        DocumentBatchItemEntity.Payload payload = item.payload;
        DocumentEntity doc = DocumentEntity.draft(
                batch.accountId, issuer, batch.environment, range, calculator.calculate(payload.lines()), now);
        doc.dueDate = payload.dueDate();
        doc.currency = payload.currency();
        doc.customer = payload.customer();
        doc.payment = payload.payment();
        doc.notes = payload.notes();
        doc.requestPayload = payload.request();
        doc.externalReference = item.reference;
        doc.batchId = batch.id;
        doc.batchPosition = item.position;
        doc.persist();
        return doc;
    }

    /** Every item has its document: the batch waits for their verdicts, or closes if they all have one. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void finish(UUID batchId) {
        DocumentBatchEntity batch = DocumentBatchEntity.lock(batchId).orElseThrow();
        if (batch.status != Status.EXPANDING) {
            return;
        }
        ended(batch);
        LOG.infof("Batch %s expanded", batch.id);
        closure.closeIfDone(batch);
    }

    /**
     * The expansion cannot go on: the items left keep no data and get no document, and the batch closes as PARTIAL (or
     * FAILED without documents) once the documents it has reach a final status.
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void stop(UUID batchId, String reason) {
        DocumentBatchEntity batch = DocumentBatchEntity.lock(batchId).orElse(null);
        if (batch == null || (batch.status != Status.RECEIVED && batch.status != Status.EXPANDING)) {
            return;
        }
        int left = DocumentBatchItemEntity.clearPending(batchId);
        batch.stopReason = reason;
        ended(batch);
        LOG.warnf("Batch %s stopped (%s) with %d invoices left", batch.id, reason, left);
        closure.closeIfDone(batch);
    }

    private void ended(DocumentBatchEntity batch) {
        batch.status = Status.PROCESSING;
        batch.expandedAt = OffsetDateTime.now(clock);
        Duration took = Duration.between(batch.createdAt, batch.expandedAt);
        String environment = batch.environment.name();
        afterCommit.run(() -> Timer.builder("cetus.batches.expansion.duration")
                .tag("environment", environment)
                .register(meters)
                .record(took));
    }

    private static boolean canIssue(IssuerEntity issuer) {
        return issuer.status == IssuerEntity.Status.ENABLED
                || (issuer.environment == Environment.TEST && issuer.status == IssuerEntity.Status.TESTING);
    }

    /** As for a single document: the sandbox answers in one to three seconds, about what the DIAN takes. */
    private static Duration delay(Environment environment) {
        return environment == Environment.SANDBOX
                ? Duration.ofMillis(ThreadLocalRandom.current().nextLong(1000, 3001))
                : Duration.ZERO;
    }
}
