package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

/** Invoices issued together from a file; see V60. */
@Entity
@Table(name = "document_batches")
public class DocumentBatchEntity extends PanacheEntityBase {

    public enum Status {
        /** Validated and stored; EXPAND_BATCH has not created any document yet. */
        RECEIVED,
        /** Creating its documents, a block at a time. */
        EXPANDING,
        /** Every document exists; waiting for them to reach a final status. */
        PROCESSING,
        COMPLETED,
        /** The expansion stopped before creating every document; the ones it created reached a final status. */
        PARTIAL,
        /** The expansion stopped before creating any document. */
        FAILED;

        public static final Set<Status> OPEN = Set.of(RECEIVED, EXPANDING, PROCESSING);

        public boolean isFinal() {
            return !OPEN.contains(this);
        }
    }

    public enum Source {
        CONSOLE,
        API
    }

    private static final List<DocumentStatus> FINAL_DOCUMENT_STATUSES =
            List.of(DocumentStatus.ACCEPTED, DocumentStatus.REJECTED, DocumentStatus.FAILED);

    @Id
    public UUID id;

    @Column(name = "account_id")
    public UUID accountId;

    @Column(name = "issuer_id")
    public UUID issuerId;

    @Enumerated(EnumType.STRING)
    public Environment environment;

    @Enumerated(EnumType.STRING)
    public Status status = Status.RECEIVED;

    @Enumerated(EnumType.STRING)
    public Source source;

    public int items;

    @Column(name = "file_name")
    public String fileName;

    @Column(name = "file_sha256")
    public String fileSha256;

    @Column(name = "created_by")
    public String createdBy;

    @Column(name = "created_by_email")
    public String createdByEmail;

    @Column(name = "stop_reason")
    public String stopReason;

    @Generated(event = EventType.INSERT)
    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "expanded_at")
    public OffsetDateTime expandedAt;

    @Column(name = "completed_at")
    public OffsetDateTime completedAt;

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public static Optional<DocumentBatchEntity> findForAccount(UUID accountId, UUID id) {
        return find("id = ?1 and accountId = ?2", id, accountId).firstResultOptional();
    }

    /** The batch, locked until the transaction ends; it serializes the closing checks of its documents. */
    public static Optional<DocumentBatchEntity> lock(UUID id) {
        return Optional.ofNullable(findById(id, LockModeType.PESSIMISTIC_WRITE));
    }

    /** The account's batches in the environment, newest first; pass the last id of the previous page as before. */
    public static List<DocumentBatchEntity> pageForAccount(
            UUID accountId, Environment environment, UUID before, int limit) {
        String query =
                "accountId = ?1 and environment = ?2" + (before == null ? "" : " and id < ?3") + " order by id desc";
        return (before == null ? find(query, accountId, environment) : find(query, accountId, environment, before))
                .page(0, limit)
                .list();
    }

    public static long countOpen(UUID accountId) {
        return count("accountId = ?1 and status in ?2", accountId, Status.OPEN);
    }

    public static List<DocumentBatchEntity> listOpen() {
        return list("status in ?1 order by createdAt", Status.OPEN);
    }

    /** The newest batch of the same file for the issuer and environment since {@code since}. */
    public static Optional<DocumentBatchEntity> findSameFile(
            UUID accountId, UUID issuerId, Environment environment, String fileSha256, OffsetDateTime since) {
        return find(
                        "accountId = ?1 and issuerId = ?2 and environment = ?3 and fileSha256 = ?4 and createdAt >= ?5"
                                + " order by createdAt desc",
                        accountId,
                        issuerId,
                        environment,
                        fileSha256,
                        since)
                .firstResultOptional();
    }

    /**
     * Items of the account's open batches in the environment that have no document yet, of one issuer or of any
     * when {@code issuerId} is null: what is promised but not yet taken from its credits, quota or ranges.
     */
    public static long pendingItems(UUID accountId, Environment environment, UUID issuerId) {
        return ((Number) getEntityManager()
                        .createNativeQuery("""
                                SELECT count(*) FROM billing.document_batch_items i
                                JOIN billing.document_batches b ON b.id = i.batch_id
                                WHERE b.account_id = :account AND b.environment = :environment
                                  AND (CAST(:issuer AS uuid) IS NULL OR b.issuer_id = CAST(:issuer AS uuid))
                                  AND b.status IN ('RECEIVED', 'EXPANDING') AND i.payload IS NOT NULL
                                """)
                        .setParameter("account", accountId)
                        .setParameter("environment", environment.name())
                        .setParameter("issuer", issuerId == null ? null : issuerId.toString())
                        .getSingleResult())
                .longValue();
    }

    /** The batch's documents counted by status. */
    public static Map<DocumentStatus, Long> documentCounts(UUID batchId) {
        Map<DocumentStatus, Long> counts = new EnumMap<>(DocumentStatus.class);
        getEntityManager()
                .createQuery(
                        "select d.status, count(d) from DocumentEntity d where d.batchId = :batch group by d.status",
                        Object[].class)
                .setParameter("batch", batchId)
                .getResultList()
                .forEach(row -> counts.put((DocumentStatus) row[0], (Long) row[1]));
        return counts;
    }

    /** Whether one of the batch's documents still waits for a final status. */
    public static boolean hasUnfinishedDocuments(UUID batchId) {
        return DocumentEntity.count("batchId = ?1 and status not in ?2", batchId, FINAL_DOCUMENT_STATUSES) > 0;
    }
}
