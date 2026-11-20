package com.cantte.cetus.api.batches;

import com.cantte.cetus.api.documents.DocumentDrafts;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.credits.CreditRefused;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentBatchEntity;
import com.cantte.cetus.persistence.entity.DocumentBatchItemEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * Receives a batch: all or nothing. It is stored only when every item is a valid invoice and the issuer, its
 * ranges and the account's credits or sandbox quota can take all of them, counting what the account's other open
 * batches still have to take. Nothing is numbered nor reserved here: EXPAND_BATCH does it, a block at a time.
 */
@ApplicationScoped
public class BatchIntake {

    private static final Logger LOG = Logger.getLogger(BatchIntake.class);

    /** Batches of an account that have not reached a final status, so one account does not fill the queue. */
    public static final int OPEN_MAX = 5;

    @Inject
    EntityManager em;

    @Inject
    DocumentDrafts drafts;

    @Inject
    BatchItems batchItems;

    @Inject
    CreditLedger credits;

    @Inject
    JobQueue jobs;

    /** Who sent the batch and from where; the email gets the notice when the batch closes. */
    public record Origin(DocumentBatchEntity.Source source, String userId, String email) {}

    @Transactional(Transactional.TxType.MANDATORY)
    public DocumentBatchEntity receive(UUID accountId, IssuerEntity issuer, BatchRequest request, Origin origin) {
        Environment environment = issuer.environment;
        drafts.ensureReady(issuer, environment);
        // Two batches of the account received at once would both count the same credits and numbers as free.
        em.createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(:key, 0))")
                .setParameter("key", "batches:" + accountId)
                .getSingleResult();
        if (DocumentBatchEntity.countOpen(accountId) >= OPEN_MAX) {
            throw new TooManyOpen();
        }

        BatchItems.Resolved resolved = batchItems.resolve(accountId, environment, issuer.id, request.items());
        if (!resolved.errors().isEmpty()) {
            throw new BatchProblem.Invalid(resolved.errors());
        }
        int count = resolved.payloads().size();
        requireNumbers(accountId, issuer, environment, count);
        requireAllowance(accountId, environment, count);

        DocumentBatchEntity batch = new DocumentBatchEntity();
        batch.id = Ids.newId();
        batch.accountId = accountId;
        batch.issuerId = issuer.id;
        batch.environment = environment;
        batch.source = origin.source();
        batch.items = count;
        batch.fileName = request.fileName();
        batch.fileSha256 = request.fileSha256();
        batch.createdBy = origin.userId();
        batch.createdByEmail = origin.email();
        batch.persistAndFlush();
        for (int position = 0; position < count; position++) {
            DocumentBatchItemEntity item = new DocumentBatchItemEntity();
            item.batchId = batch.id;
            item.position = position;
            item.reference = request.items().get(position).reference();
            item.payload = resolved.payloads().get(position);
            item.persist();
        }
        jobs.enqueue(JobTypes.EXPAND_BATCH, batch.id);
        LOG.infof("Batch %s received with %d invoices (%s)", batch.id, count, environment);
        return batch;
    }

    /** The issuer's usable invoice ranges must have a number for every item, after the open batches take theirs. */
    private static void requireNumbers(UUID accountId, IssuerEntity issuer, Environment environment, int count) {
        LocalDate today = LocalDate.now(DianTime.ZONE);
        List<NumberingRangeEntity> ranges = NumberingRangeEntity.listUsable(issuer.id, DocumentType.INVOICE, today);
        if (ranges.isEmpty()) {
            throw new DomainException(
                    "no_active_numbering_range", "The issuer has no active numbering range for invoices");
        }
        if (environment == Environment.LIVE && ranges.getFirst().technicalKeySealed == null) {
            throw new DomainException(
                    "technical_key_pending",
                    "The numbering range is waiting for its technical key from the DIAN; try again in a few minutes");
        }
        long free = ranges.stream().mapToLong(NumberingRangeEntity::remaining).sum()
                - DocumentBatchEntity.pendingItems(accountId, environment, issuer.id);
        if (free < count) {
            throw new DomainException(
                    "numbering_range_insufficient",
                    "The issuer's ranges have " + Math.max(0, free) + " numbers left and the batch has " + count
                            + " invoices");
        }
    }

    /** LIVE takes a credit per document, SANDBOX a slot of the daily quota; TEST takes neither. */
    private void requireAllowance(UUID accountId, Environment environment, int count) {
        switch (environment) {
            case LIVE -> {
                long pending = DocumentBatchEntity.pendingItems(accountId, environment, null);
                long capacity = credits.capacity(accountId, OffsetDateTime.now());
                if (capacity - pending < count) {
                    credits.refuse(
                            accountId,
                            new CreditRefused(
                                    CreditRefused.Reason.INSUFFICIENT_CREDITS,
                                    "The account can issue " + Math.max(0, capacity - pending)
                                            + " more documents and the batch has " + count + " invoices"));
                }
            }
            case SANDBOX -> drafts.requireSandboxQuota(accountId, count);
            case TEST -> {}
        }
    }

    /** 409 while the account has {@link #OPEN_MAX} batches without a final status. */
    public static class TooManyOpen extends WebApplicationException {

        TooManyOpen() {
            super(ProblemDetail.response(
                    409,
                    "too_many_open_batches",
                    "The account already has " + OPEN_MAX + " batches in progress; wait for one to finish"));
        }
    }
}
