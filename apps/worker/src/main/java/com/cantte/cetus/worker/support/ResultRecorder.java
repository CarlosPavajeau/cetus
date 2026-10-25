package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.usage.UsageAlerts;
import com.cantte.cetus.domain.usage.UsagePeriod;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.notifications.Notifications;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.DianSubmissionEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import com.cantte.cetus.persistence.usage.UsageCounters;
import com.cantte.cetus.webhooks.WebhookEventType;
import com.cantte.cetus.webhooks.WebhookEventType.Outcome;
import com.cantte.cetus.webhooks.WebhookPublisher;
import com.cantte.cetus.worker.notifications.Dates;
import com.cantte.cetus.worker.notifications.Numbers;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Short transactions that persist the outcome of each step. */
@ApplicationScoped
public class ResultRecorder {

    @Inject
    JobQueue jobs;

    @Inject
    WebhookPublisher webhooks;

    @Inject
    UsageCounters usage;

    @Inject
    Notifications notifications;

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void artifact(UUID documentId, DocumentArtifactEntity.Kind kind, DocumentStorage.StoredObject stored) {
        DocumentArtifactEntity artifact = new DocumentArtifactEntity();
        artifact.id = Ids.newId();
        artifact.documentId = documentId;
        artifact.kind = kind;
        artifact.s3Key = stored.key();
        artifact.sha256 = stored.sha256();
        artifact.sizeBytes = stored.size();
        artifact.contentType = stored.contentType();
        artifact.persist();
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void submission(
            UUID documentId,
            String operation,
            String trackId,
            boolean timedOut,
            DianResponse response,
            List<String> errors,
            long durationMs) {
        DianSubmissionEntity submission = new DianSubmissionEntity();
        submission.id = Ids.newId();
        submission.documentId = documentId;
        submission.operation = operation;
        submission.trackId = trackId;
        submission.timedOut = timedOut;
        submission.durationMs = (int) durationMs;
        if (response != null) {
            submission.valid = response.valid();
            submission.statusCode = response.statusCode();
            submission.statusMessage = response.statusDescription();
        }
        submission.errors = new ArrayList<>(errors == null ? List.of() : errors);
        submission.persist();
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void cufe(UUID documentId, String cufe) {
        DocumentEntity doc = DocumentEntity.findById(documentId);
        doc.cufe = cufe;
    }

    /** Async test set upload accepted by the DIAN: poll GetStatusZip later. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void submitted(UUID documentId, String zipKey) {
        DocumentEntity doc = DocumentEntity.findById(documentId);
        doc.status = DocumentStatus.SUBMITTED;
        doc.dianTrackId = zipKey;
        jobs.enqueue(JobTypes.CHECK_TEST_SET_STATUS, documentId, Duration.ofSeconds(10));
    }

    /**
     * The DIAN's verdict. Recorded once: a job whose lease expired can run again and get its own answer, and
     * the document must not be delivered, published or billed twice.
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void completed(UUID documentId, DianResponse response) {
        DocumentEntity doc = DocumentEntity.findById(documentId, LockModeType.PESSIMISTIC_WRITE);
        if (doc.status.isFinal()) {
            return;
        }
        doc.status = response.valid() ? DocumentStatus.ACCEPTED : DocumentStatus.REJECTED;
        doc.dianStatusCode = response.statusCode();
        doc.dianStatusMessage = response.statusDescription();
        doc.dianErrors = new ArrayList<>(response.errors());
        doc.validatedAt = OffsetDateTime.now();
        if (response.valid()) {
            // Same transaction as the status change: an accepted document is always delivered.
            jobs.enqueue(JobTypes.DELIVER_DOCUMENT, documentId);
            if (doc.environment == Environment.LIVE) {
                bill(doc);
            }
        }
        webhooks.publish(
                WebhookEventType.forDocument(doc.documentType, response.valid() ? Outcome.ACCEPTED : Outcome.REJECTED),
                doc);
    }

    /** Counts the document in its month and tells the billing contact when the month reaches a share of the plan. */
    private void bill(DocumentEntity doc) {
        YearMonth period = UsagePeriod.of(doc.validatedAt);
        long total = usage.record(doc.accountId, period, doc.documentType);
        PlanEntity plan = PlanEntity.of(AccountEntity.findById(doc.accountId));
        if (plan.includedDocuments == null) {
            return;
        }
        UsageAlerts.reached(total, plan.includedDocuments).ifPresent(percent -> {
            Map<String, String> data = new HashMap<>(Map.of(
                    "plan", plan.name,
                    "percent", percent.toString(),
                    "total", Numbers.count(total),
                    "included", Numbers.count(plan.includedDocuments),
                    "period", Dates.month(period)));
            if (plan.overagePriceCop != null) {
                data.put("overagePrice", Numbers.cop(plan.overagePriceCop));
            }
            notifications.request(
                    doc.accountId,
                    NotificationKind.PLAN_USAGE,
                    "plan_usage:%s:%s:%s:%d".formatted(doc.accountId, period, plan.code, percent),
                    data);
        });
    }

    /** The DIAN accepted the issuer's test set; the API stops taking test invoices for it. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void testSetAccepted(UUID issuerId, String testSetId) {
        SoftwareCredentialEntity.markTestSetAccepted(issuerId, testSetId);
    }

    /**
     * A failed attempt. The job may still retry it (and the document go back to PROCESSING), so integrators
     * are not told yet: {@link #gaveUp} does that once nothing will run again.
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void failed(UUID documentId, String message) {
        DocumentEntity doc = DocumentEntity.findById(documentId);
        if (!doc.status.isFinal()) {
            doc.status = DocumentStatus.FAILED;
            doc.dianStatusMessage = message;
        }
    }

    /** The document stays FAILED for good: no job will process it again. Publishes the failed event once. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void gaveUp(UUID documentId, String message) {
        DocumentEntity doc = DocumentEntity.findById(documentId);
        if (doc.status.isFinal()) {
            return;
        }
        doc.status = DocumentStatus.FAILED;
        doc.dianStatusMessage = message;
        webhooks.publish(WebhookEventType.forDocument(doc.documentType, Outcome.FAILED), doc);
    }
}
