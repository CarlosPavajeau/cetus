package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.admin.AdminViews.AccountSummaryView;
import com.cantte.cetus.api.admin.AdminViews.FailedDocumentView;
import com.cantte.cetus.api.admin.AdminViews.UsageCountView;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

/**
 * Reads across accounts for the Cetus team. Usage is counted from {@code documents} until usage counters
 * exist; "this month" is the calendar month in Colombia.
 */
@ApplicationScoped
public class AdminAccountQueries {

    public static final int MAX_PAGE_SIZE = 100;
    static final int RECENT_FAILURES = 20;

    private static final ZoneId COLOMBIA = ZoneId.of("America/Bogota");
    private static final TypeReference<List<String>> STRINGS = new TypeReference<>() {
    };

    @Inject
    EntityManager em;
    @Inject
    ObjectMapper mapper;

    /** Newest first; the next page starts below {@code before} (account ids are time-ordered UUIDs). */
    public List<AccountSummaryView> list(String status, List<String> organizationIds, UUID before, int size) {
        StringBuilder sql = new StringBuilder("""
                SELECT a.id, a.organization_id, a.name, a.status, a.plan, a.created_at,
                       (SELECT count(*) FROM billing.issuers i WHERE i.account_id = a.id),
                       (SELECT count(*) FROM billing.issuers i
                        WHERE i.account_id = a.id AND i.environment = 'LIVE' AND i.status = 'ENABLED'),
                       (SELECT count(*) FROM billing.documents d
                        WHERE d.account_id = a.id AND d.environment = 'LIVE' AND d.created_at >= :monthStart),
                       (SELECT count(*) FROM billing.documents d
                        WHERE d.account_id = a.id AND d.status IN ('REJECTED', 'FAILED') AND d.created_at >= :weekAgo),
                       (SELECT max(d.updated_at) FROM billing.documents d
                        WHERE d.account_id = a.id AND d.status IN ('REJECTED', 'FAILED'))
                FROM billing.accounts a
                WHERE true
                """);
        if (status != null) {
            sql.append(" AND a.status = :status");
        }
        if (organizationIds != null && !organizationIds.isEmpty()) {
            sql.append(" AND a.organization_id IN (:organizationIds)");
        }
        if (before != null) {
            sql.append(" AND a.id < :before");
        }
        sql.append(" ORDER BY a.id DESC LIMIT :limit");

        Query query = em.createNativeQuery(sql.toString())
                .setParameter("monthStart", monthStart())
                .setParameter("weekAgo", OffsetDateTime.now().minusDays(7))
                .setParameter("limit", size);
        if (status != null) {
            query.setParameter("status", status);
        }
        if (organizationIds != null && !organizationIds.isEmpty()) {
            query.setParameter("organizationIds", organizationIds);
        }
        if (before != null) {
            query.setParameter("before", before);
        }
        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        return rows.stream().map(row -> new AccountSummaryView(
                (UUID) row[0], (String) row[1], (String) row[2], (String) row[3], (String) row[4],
                toOffsetDateTime(row[5]), count(row[6]), count(row[7]), count(row[8]), count(row[9]),
                row[10] == null ? null : toOffsetDateTime(row[10]))).toList();
    }

    /** Documents created this month, by environment, type and status. */
    public List<UsageCountView> usageThisMonth(UUID accountId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT environment, document_type, status, count(*)
                        FROM billing.documents
                        WHERE account_id = :account AND created_at >= :monthStart
                        GROUP BY environment, document_type, status
                        ORDER BY environment, document_type, status
                        """)
                .setParameter("account", accountId)
                .setParameter("monthStart", monthStart())
                .getResultList();
        return rows.stream().map(row -> new UsageCountView(
                Environment.valueOf((String) row[0]), DocumentType.valueOf((String) row[1]), (String) row[2],
                count(row[3]))).toList();
    }

    /** The latest documents the DIAN rejected or that could not be sent, with the DIAN's errors. */
    public List<FailedDocumentView> recentFailures(UUID accountId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT id, issuer_id, environment, document_type, prefix, number, status,
                               dian_status_code, dian_status_message, CAST(dian_errors AS text), updated_at
                        FROM billing.documents
                        WHERE account_id = :account AND status IN ('REJECTED', 'FAILED')
                        ORDER BY updated_at DESC
                        LIMIT :limit
                        """)
                .setParameter("account", accountId)
                .setParameter("limit", RECENT_FAILURES)
                .getResultList();
        return rows.stream().map(row -> new FailedDocumentView(
                (UUID) row[0], (UUID) row[1], Environment.valueOf((String) row[2]),
                DocumentType.valueOf((String) row[3]), row[4] + String.valueOf(row[5]), (String) row[6],
                (String) row[7], (String) row[8], errors((String) row[9]), toOffsetDateTime(row[10]))).toList();
    }

    private List<String> errors(String json) {
        try {
            return mapper.readValue(json, STRINGS);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Corrupt dian_errors", e);
        }
    }

    static OffsetDateTime monthStart() {
        return LocalDate.now(COLOMBIA).withDayOfMonth(1).atStartOfDay(COLOMBIA).toOffsetDateTime();
    }

    private static long count(Object value) {
        return ((Number) value).longValue();
    }

    private static OffsetDateTime toOffsetDateTime(Object value) {
        return switch (value) {
            case OffsetDateTime odt -> odt;
            case Instant instant -> instant.atOffset(ZoneOffset.UTC);
            case Timestamp timestamp -> timestamp.toInstant().atOffset(ZoneOffset.UTC);
            default -> throw new IllegalStateException("Unexpected timestamp type " + value.getClass());
        };
    }
}
