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
import java.util.Arrays;
import java.util.EnumMap;
import java.util.HashMap;
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
    }

    public enum Source {
        CONSOLE,
        API
    }

    private static final List<DocumentStatus> FINAL_DOCUMENT_STATUSES = Arrays.stream(DocumentStatus.values())
            .filter(DocumentStatus::isFinal)
            .toList();

    /**
     * The batch's documents by status. {@code pending} have not reached a final status yet; {@code notCreated} are
     * items the expansion has not turned into documents, either yet or ever, when it stopped.
     */
    public record Counts(long accepted, long rejected, long failed, long pending, long notCreated) {

        public long created() {
            return accepted + rejected + failed + pending;
        }
    }

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

    /** The person left the account's organization: their batches stop emailing them. */
    public static int forgetSender(UUID accountId, String userId) {
        return update(
                "createdByEmail = null where accountId = ?1 and createdBy = ?2 and createdByEmail is not null",
                accountId,
                userId);
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
                                  AND i.payload IS NOT NULL
                                """)
                        .setParameter("account", accountId)
                        .setParameter("environment", environment.name())
                        .setParameter("issuer", issuerId == null ? null : issuerId.toString())
                        .getSingleResult())
                .longValue();
    }

    public Counts counts() {
        return countsOf(List.of(this)).get(id);
    }

    /** The counts of every batch given, with one query. */
    public static Map<UUID, Counts> countsOf(List<DocumentBatchEntity> batches) {
        if (batches.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Map<DocumentStatus, Long>> byBatch = new HashMap<>();
        getEntityManager()
                .createQuery(
                        "select d.batchId, d.status, count(d) from DocumentEntity d where d.batchId in :batches"
                                + " group by d.batchId, d.status",
                        Object[].class)
                .setParameter("batches", batches.stream().map(batch -> batch.id).toList())
                .getResultList()
                .forEach(row -> byBatch.computeIfAbsent((UUID) row[0], key -> new EnumMap<>(DocumentStatus.class))
                        .put((DocumentStatus) row[1], (Long) row[2]));
        Map<UUID, Counts> counts = new HashMap<>();
        batches.forEach(batch -> counts.put(batch.id, batch.counts(byBatch.getOrDefault(batch.id, Map.of()))));
        return counts;
    }

    private Counts counts(Map<DocumentStatus, Long> byStatus) {
        long accepted = byStatus.getOrDefault(DocumentStatus.ACCEPTED, 0L);
        long rejected = byStatus.getOrDefault(DocumentStatus.REJECTED, 0L);
        long failed = byStatus.getOrDefault(DocumentStatus.FAILED, 0L);
        long created = byStatus.values().stream().mapToLong(Long::longValue).sum();
        return new Counts(
                accepted, rejected, failed, created - accepted - rejected - failed, Math.max(0, items - created));
    }

    /** The last change to the batch or to its documents; the expansion moves it with every document it creates. */
    public OffsetDateTime movedAt() {
        return movedAtOf(List.of(this)).get(id);
    }

    /** {@link #movedAt} of every batch given, with one query. */
    public static Map<UUID, OffsetDateTime> movedAtOf(List<DocumentBatchEntity> batches) {
        if (batches.isEmpty()) {
            return Map.of();
        }
        Map<UUID, OffsetDateTime> documentNewestAt = new HashMap<>();
        getEntityManager()
                .createQuery(
                        "select d.batchId, max(d.createdAt) from DocumentEntity d where d.batchId in :batches"
                                + " group by d.batchId",
                        Object[].class)
                .setParameter("batches", batches.stream().map(batch -> batch.id).toList())
                .getResultList()
                .forEach(row -> documentNewestAt.put((UUID) row[0], (OffsetDateTime) row[1]));
        Map<UUID, OffsetDateTime> movedAt = new HashMap<>();
        batches.forEach(batch -> {
            OffsetDateTime newest = documentNewestAt.get(batch.id);
            movedAt.put(batch.id, newest == null || newest.isBefore(batch.updatedAt) ? batch.updatedAt : newest);
        });
        return movedAt;
    }

    public static boolean hasUnfinishedDocuments(UUID batchId) {
        return DocumentEntity.count("batchId = ?1 and status not in ?2", batchId, FINAL_DOCUMENT_STATUSES) > 0;
    }
}
