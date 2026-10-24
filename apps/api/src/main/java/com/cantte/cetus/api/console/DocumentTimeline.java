package com.cantte.cetus.api.console;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DianSubmissionEntity;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.WebhookEventEntity;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * What happened to a document, oldest first. There is no history table: the timeline is put together from
 * the DIAN calls, the processing job, the email deliveries and the webhook events.
 */
public final class DocumentTimeline {

    public enum DocumentEventKind {
        /** The API took the document. */
        CREATED,
        /** One call to the DIAN; {@code status} says how it went. */
        DIAN_SUBMISSION,
        /** The DIAN's final answer: ACCEPTED or REJECTED. */
        VALIDATED,
        /** The worker gave up processing the document. */
        PROCESSING_FAILED,
        /** The email to the customer left Cetus. */
        DELIVERY_SENT,
        /** Latest news of an email: delivered, bounced, marked as spam or failed. */
        DELIVERY_UPDATED,
        /** An event published to the account's webhook endpoints. */
        WEBHOOK_EVENT
    }

    /**
     * Status of a DIAN call: VALID or INVALID when the DIAN answered, PENDING when it took an asynchronous
     * upload, TIMED_OUT or NO_ANSWER when the answer never came.
     */
    public record DocumentEvent(
            @Schema(required = true) OffsetDateTime at,
            @Schema(required = true) DocumentEventKind kind,
            @Schema(required = true, nullable = true) String status,

            @Schema(required = true, nullable = true, description = "DIAN operation, e.g. SendBillSync")
            String operation,

            @Schema(required = true, nullable = true, description = "DIAN status code")
            String code,

            @Schema(required = true, nullable = true) String message,
            @Schema(required = true, nullable = true) Integer durationMs) {}

    private DocumentTimeline() {}

    /** Must run in a transaction. */
    public static List<DocumentEvent> of(DocumentEntity doc) {
        List<DocumentEvent> events = new ArrayList<>();
        events.add(new DocumentEvent(doc.createdAt, DocumentEventKind.CREATED, null, null, null, null, null));

        List<DianSubmissionEntity> submissions =
                DianSubmissionEntity.list("documentId = ?1 order by createdAt", doc.id);
        for (DianSubmissionEntity submission : submissions) {
            events.add(new DocumentEvent(
                    submission.createdAt,
                    DocumentEventKind.DIAN_SUBMISSION,
                    submissionStatus(submission),
                    submission.operation,
                    submission.statusCode,
                    submission.statusMessage,
                    submission.durationMs));
        }

        if (doc.validatedAt != null) {
            events.add(new DocumentEvent(
                    doc.validatedAt,
                    DocumentEventKind.VALIDATED,
                    doc.status.name(),
                    null,
                    doc.dianStatusCode,
                    doc.dianStatusMessage,
                    null));
        }

        JobEntity.<JobEntity>list(
                        "jobType = ?1 and referenceId = ?2 and status = 'DEAD'", JobTypes.PROCESS_DOCUMENT, doc.id)
                .forEach(job -> events.add(new DocumentEvent(
                        job.updatedAt, DocumentEventKind.PROCESSING_FAILED, null, null, null, job.lastError, null)));

        for (DocumentDeliveryEntity delivery : DocumentDeliveryEntity.listByDocument(doc.id)) {
            if (delivery.sentAt != null) {
                events.add(new DocumentEvent(
                        delivery.sentAt,
                        DocumentEventKind.DELIVERY_SENT,
                        DocumentDeliveryEntity.Status.SENT.name(),
                        null,
                        null,
                        delivery.recipient,
                        null));
            }
            if (delivery.status != DocumentDeliveryEntity.Status.SENT
                    && delivery.status != DocumentDeliveryEntity.Status.PENDING) {
                OffsetDateTime at = delivery.lastEventAt != null ? delivery.lastEventAt : delivery.updatedAt;
                events.add(new DocumentEvent(
                        at,
                        DocumentEventKind.DELIVERY_UPDATED,
                        delivery.status.name(),
                        null,
                        null,
                        delivery.error != null ? delivery.error : delivery.recipient,
                        null));
            }
        }

        WebhookEventEntity.<WebhookEventEntity>list("documentId = ?1 order by createdAt", doc.id)
                .forEach(event -> events.add(new DocumentEvent(
                        event.createdAt, DocumentEventKind.WEBHOOK_EVENT, null, null, null, event.type, null)));

        // Stable: events with the same instant keep the order they were added in, which follows the flow.
        events.sort(Comparator.comparing(DocumentEvent::at, Comparator.nullsLast(Comparator.naturalOrder())));
        return events;
    }

    static String submissionStatus(DianSubmissionEntity submission) {
        if (submission.valid != null) {
            return submission.valid ? "VALID" : "INVALID";
        }
        if (submission.timedOut) {
            return "TIMED_OUT";
        }
        return submission.trackId != null ? "PENDING" : "NO_ANSWER";
    }
}
