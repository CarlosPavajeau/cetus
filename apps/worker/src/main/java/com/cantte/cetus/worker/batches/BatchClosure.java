package com.cantte.cetus.worker.batches;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.notifications.Notifications;
import com.cantte.cetus.persistence.AfterCommit;
import com.cantte.cetus.persistence.entity.DocumentBatchEntity;
import com.cantte.cetus.persistence.entity.DocumentBatchEntity.Status;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * Closes a batch once its expansion ended and its last document reached a final status. Every check locks the batch,
 * so the expansion's end and two documents finishing at once agree on which of them closes it. The batch lock is
 * always taken last: after the document's and the account's credits.
 */
@ApplicationScoped
public class BatchClosure {

    private static final Logger LOG = Logger.getLogger(BatchClosure.class);

    @Inject
    Notifications notifications;

    @Inject
    AfterCommit afterCommit;

    @Inject
    MeterRegistry meters;

    void registerCounters(@Observes StartupEvent event) {
        // From zero, as JobRunner does: a counter whose first sample is already 1 shows no increase, and the first
        // PARTIAL or FAILED batch would raise no alert.
        for (Environment environment : Environment.values()) {
            for (Status outcome : List.of(Status.COMPLETED, Status.PARTIAL, Status.FAILED)) {
                completed(environment, outcome).increment(0);
            }
        }
    }

    /** Called in the transaction that gave one of the batch's documents its final status. */
    @Transactional(Transactional.TxType.MANDATORY)
    public void documentFinished(UUID batchId) {
        DocumentBatchEntity.lock(batchId).ifPresent(this::closeIfDone);
    }

    /**
     * COMPLETED when every item got its document, PARTIAL when the expansion stopped after creating some, FAILED when
     * it created none. The person who sent the batch gets a notice.
     *
     * @param batch locked by the caller
     * @return whether it closed the batch now
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public boolean closeIfDone(DocumentBatchEntity batch) {
        if (batch.status != Status.PROCESSING || DocumentBatchEntity.hasUnfinishedDocuments(batch.id)) {
            return false;
        }
        DocumentBatchEntity.Counts counts = batch.counts();
        batch.status =
                batch.stopReason == null ? Status.COMPLETED : counts.created() == 0 ? Status.FAILED : Status.PARTIAL;
        batch.completedAt = OffsetDateTime.now();
        notice(batch, counts);
        LOG.infof("Batch %s closed as %s", batch.id, batch.status);
        Counter counter = completed(batch.environment, batch.status);
        afterCommit.run(counter::increment);
        return true;
    }

    private Counter completed(Environment environment, Status outcome) {
        return meters.counter(
                "cetus.batches.completed",
                "environment",
                environment.name(),
                "outcome",
                outcome.name().toLowerCase());
    }

    private void notice(DocumentBatchEntity batch, DocumentBatchEntity.Counts counts) {
        if (batch.createdByEmail == null) {
            return;
        }
        Map<String, String> data = new HashMap<>();
        data.put("email", batch.createdByEmail);
        data.put("batchId", batch.id.toString());
        data.put("environment", batch.environment.name());
        data.put("status", batch.status.name());
        data.put("items", Integer.toString(batch.items));
        data.put("accepted", Long.toString(counts.accepted()));
        data.put("rejected", Long.toString(counts.rejected()));
        data.put("failed", Long.toString(counts.failed()));
        data.put("notCreated", Long.toString(counts.notCreated()));
        if (batch.fileName != null) {
            data.put("fileName", batch.fileName);
        }
        notifications.request(batch.accountId, NotificationKind.BATCH_FINISHED, "batch_finished:" + batch.id, data);
    }
}
