package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DianSubmissionEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Short transactions that persist the outcome of each step. */
@ApplicationScoped
public class ResultRecorder {

    @Inject
    JobQueue jobs;

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
    public void submission(UUID documentId, String operation, String trackId, boolean timedOut,
                           DianResponse response, List<String> errors, long durationMs) {
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

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void completed(UUID documentId, DianResponse response) {
        DocumentEntity doc = DocumentEntity.findById(documentId);
        doc.status = response.valid() ? DocumentStatus.ACCEPTED : DocumentStatus.REJECTED;
        doc.dianStatusCode = response.statusCode();
        doc.dianStatusMessage = response.statusDescription();
        doc.dianErrors = new ArrayList<>(response.errors());
        doc.validatedAt = OffsetDateTime.now();
        if (response.valid()) {
            // Same transaction as the status change: an accepted document is always delivered.
            jobs.enqueue(JobTypes.DELIVER_DOCUMENT, documentId);
        }
    }

    /** The DIAN accepted the issuer's test set; the API stops taking test invoices for it. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void testSetAccepted(UUID issuerId, String testSetId) {
        SoftwareCredentialEntity.markTestSetAccepted(issuerId, testSetId);
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void failed(UUID documentId, String message) {
        DocumentEntity doc = DocumentEntity.findById(documentId);
        if (!doc.status.isFinal()) {
            doc.status = DocumentStatus.FAILED;
            doc.dianStatusMessage = message;
        }
    }
}
