package com.cantte.cetus.persistence.usage;

import com.cantte.cetus.domain.model.DocumentType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.YearMonth;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.SequencedMap;
import java.util.TreeMap;
import java.util.UUID;

/** Billable documents per account, month and document type; see V24. */
@ApplicationScoped
public class UsageCounters {

    @Inject
    EntityManager em;

    /** Counts one more document and returns the account's total for the period. */
    @Transactional(Transactional.TxType.MANDATORY)
    public long record(UUID accountId, YearMonth period, DocumentType type) {
        em.createNativeQuery("""
                        INSERT INTO billing.usage_counters (account_id, period, document_type, count)
                        VALUES (:account, :period, :type, 1)
                        ON CONFLICT (account_id, period, document_type)
                        DO UPDATE SET count = usage_counters.count + 1, updated_at = now()
                        """)
                .setParameter("account", accountId)
                .setParameter("period", period.toString())
                .setParameter("type", type.name())
                .executeUpdate();
        return total(accountId, period);
    }

    public long total(UUID accountId, YearMonth period) {
        return ((Number) em.createNativeQuery("""
                        SELECT coalesce(sum(count), 0)
                        FROM billing.usage_counters
                        WHERE account_id = :account AND period = :period
                        """)
                        .setParameter("account", accountId)
                        .setParameter("period", period.toString())
                        .getSingleResult())
                .longValue();
    }

    /** The account's total of each month from {@code first} to {@code last}, with zero for months without documents. */
    public SequencedMap<YearMonth, Long> totals(UUID accountId, YearMonth first, YearMonth last) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT period, sum(count)
                        FROM billing.usage_counters
                        WHERE account_id = :account AND period BETWEEN :first AND :last
                        GROUP BY period
                        """)
                .setParameter("account", accountId)
                .setParameter("first", first.toString())
                .setParameter("last", last.toString())
                .getResultList();
        SequencedMap<YearMonth, Long> totals = new TreeMap<>();
        for (YearMonth month = first; !month.isAfter(last); month = month.plusMonths(1)) {
            totals.put(month, 0L);
        }
        rows.forEach(row -> totals.put(YearMonth.parse((String) row[0]), ((Number) row[1]).longValue()));
        return totals;
    }

    /** Every document type, with zero for those not issued in the period. */
    public Map<DocumentType, Long> byType(UUID accountId, YearMonth period) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT document_type, count
                        FROM billing.usage_counters
                        WHERE account_id = :account AND period = :period
                        """)
                .setParameter("account", accountId)
                .setParameter("period", period.toString())
                .getResultList();
        Map<DocumentType, Long> counts = new EnumMap<>(DocumentType.class);
        for (DocumentType type : DocumentType.values()) {
            counts.put(type, 0L);
        }
        rows.forEach(row -> counts.put(DocumentType.valueOf((String) row[0]), ((Number) row[1]).longValue()));
        return counts;
    }
}
