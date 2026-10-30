package com.cantte.cetus.api.usage;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.usage.UsagePeriod;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

/**
 * The production documents a plan with a grace takes each month. They are counted when created, not when the
 * DIAN accepts them, so documents still on their way take their slot; a rejected one gives it back.
 */
@ApplicationScoped
public class PlanDocumentLimit {

    /**
     * Refuses a production document once the month reached the plan's included documents plus its grace. A
     * lock per account until the transaction ends keeps two requests from both taking the last slot.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public void require(UUID accountId, DocumentType type) {
        if (type == DocumentType.CREDIT_NOTE) {
            return;
        }
        @SuppressWarnings("unchecked")
        List<Number> limits = DocumentEntity.getEntityManager()
                .createNativeQuery("""
                        SELECT p.documents_included + p.documents_grace
                        FROM billing.accounts a JOIN billing.plans p ON p.code = a.plan
                        WHERE a.id = :account AND p.documents_grace IS NOT NULL
                        """)
                .setParameter("account", accountId)
                .getResultList();
        if (limits.isEmpty()) {
            return;
        }
        long limit = limits.getFirst().longValue();
        DocumentEntity.getEntityManager()
                .createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(:key, 0))")
                .setParameter("key", "plan-documents:" + accountId)
                .getSingleResult();
        YearMonth period = UsagePeriod.current();
        long issued = DocumentEntity.count(
                "accountId = ?1 and environment = ?2 and status <> ?3 and createdAt >= ?4",
                accountId,
                Environment.LIVE,
                DocumentStatus.REJECTED,
                UsagePeriod.start(period));
        if (issued >= limit) {
            throw new Reached(limit);
        }
    }

    /** 402: the account needs another plan, or the next month, to issue more. */
    public static class Reached extends WebApplicationException {

        Reached(long limit) {
            super(ProblemDetail.builder(
                            402,
                            "plan_document_limit",
                            "The account already issued the " + limit
                                    + " production documents its plan takes this month; credit notes can"
                                    + " still be issued")
                    .build());
        }
    }
}
