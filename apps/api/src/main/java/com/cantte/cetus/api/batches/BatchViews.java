package com.cantte.cetus.api.batches;

import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentBatchEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public final class BatchViews {

    private BatchViews() {}

    @Schema(name = "BatchStatus")
    public enum Status {
        RECEIVED,
        EXPANDING,
        PROCESSING,
        COMPLETED,
        PARTIAL,
        FAILED;

        static Status of(DocumentBatchEntity.Status status) {
            return valueOf(status.name());
        }
    }

    @Schema(name = "BatchSource")
    public enum Source {
        CONSOLE,
        API
    }

    public record BatchCreated(UUID id, Status status, int items) {}

    /**
     * The batch's documents by status. {@code pending} have not reached a final status yet; {@code notCreated} are
     * items the expansion has not turned into documents, either yet or ever, when it stopped.
     */
    public record BatchCounts(long accepted, long rejected, long failed, long pending, long notCreated) {

        static BatchCounts of(DocumentBatchEntity.Counts counts) {
            return new BatchCounts(
                    counts.accepted(), counts.rejected(), counts.failed(), counts.pending(), counts.notCreated());
        }
    }

    public record BatchView(
            UUID id,
            UUID issuerId,
            String issuerName,
            Environment environment,
            Status status,
            Source source,
            int items,
            BatchCounts counts,
            @Schema(nullable = true) String fileName,

            @Schema(nullable = true, description = "Why the batch stopped creating documents")
            String stopReason,

            @Schema(description = "The expansion has created no document for a while: the batch waits for its turn")
            boolean waiting,

            OffsetDateTime createdAt,
            @Schema(nullable = true) OffsetDateTime expandedAt,
            @Schema(nullable = true) OffsetDateTime completedAt) {

        static BatchView from(
                DocumentBatchEntity batch,
                String issuerName,
                DocumentBatchEntity.Counts counts,
                OffsetDateTime movedAt,
                Duration waitingAfter) {
            boolean waiting = batch.status == DocumentBatchEntity.Status.EXPANDING
                    && movedAt.isBefore(OffsetDateTime.now().minus(waitingAfter));
            return new BatchView(
                    batch.id,
                    batch.issuerId,
                    issuerName,
                    batch.environment,
                    Status.of(batch.status),
                    Source.valueOf(batch.source.name()),
                    batch.items,
                    BatchCounts.of(counts),
                    batch.fileName,
                    batch.stopReason,
                    waiting,
                    batch.createdAt,
                    batch.expandedAt,
                    batch.completedAt);
        }
    }

    public record BatchPage(
            @Schema(description = "Newest first") List<BatchView> items,

            @Schema(nullable = true, description = "Pass as before to get the next page")
            UUID nextCursor) {}

    public record BatchDocument(
            UUID id,
            int position,
            @Schema(nullable = true) String reference,
            String number,
            DocumentStatus status,
            @Schema(nullable = true) String statusMessage) {

        static BatchDocument from(DocumentEntity doc) {
            return new BatchDocument(
                    doc.id,
                    doc.batchPosition,
                    doc.externalReference,
                    doc.fullNumber(),
                    doc.status,
                    doc.status == DocumentStatus.ACCEPTED ? null : doc.dianStatusMessage);
        }
    }

    public record BatchDocumentPage(
            @Schema(description = "By position") List<BatchDocument> items,

            @Schema(nullable = true, description = "Pass as after to get the next page")
            Integer nextCursor) {}

    /** When the same file was sent for the issuer and environment in the last day. */
    public record SameFile(UUID id, Status status, OffsetDateTime createdAt) {}
}
