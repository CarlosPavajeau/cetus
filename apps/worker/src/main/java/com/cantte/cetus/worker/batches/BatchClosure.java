package com.cantte.cetus.worker.batches;

import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.notifications.Notifications;
import com.cantte.cetus.persistence.AfterCommit;
import com.cantte.cetus.persistence.entity.DocumentBatchEntity;
import com.cantte.cetus.persistence.entity.DocumentBatchEntity.Status;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.HashMap;
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
        Map<DocumentStatus, Long> counts = DocumentBatchEntity.documentCounts(batch.id);
        long created = counts.values().stream().mapToLong(Long::longValue).sum();
        batch.status = batch.stopReason == null ? Status.COMPLETED : created == 0 ? Status.FAILED : Status.PARTIAL;
        batch.completedAt = OffsetDateTime.now();
        notice(batch, counts, created);
        LOG.infof("Batch %s closed as %s", batch.id, batch.status);
        String environment = batch.environment.name();
        String outcome = batch.status.name().toLowerCase();
        afterCommit.run(() -> meters.counter("cetus.batches.completed", "environment", environment, "outcome", outcome)
                .increment());
        return true;
    }

    private void notice(DocumentBatchEntity batch, Map<DocumentStatus, Long> counts, long created) {
        if (batch.createdByEmail == null) {
            return;
        }
        Map<String, String> data = new HashMap<>();
        data.put("email", batch.createdByEmail);
        data.put("batchId", batch.id.toString());
        data.put("environment", batch.environment.name());
        data.put("status", batch.status.name());
        data.put("items", Integer.toString(batch.items));
        data.put("accepted", Long.toString(counts.getOrDefault(DocumentStatus.ACCEPTED, 0L)));
        data.put("rejected", Long.toString(counts.getOrDefault(DocumentStatus.REJECTED, 0L)));
        data.put("failed", Long.toString(counts.getOrDefault(DocumentStatus.FAILED, 0L)));
        data.put("notCreated", Long.toString(Math.max(0, batch.items - created)));
        if (batch.fileName != null) {
            data.put("fileName", batch.fileName);
        }
        notifications.request(batch.accountId, NotificationKind.BATCH_FINISHED, "batch_finished:" + batch.id, data);
    }
}
