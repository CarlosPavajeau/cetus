package com.cantte.cetus.api.metrics;

import static com.cantte.cetus.persistence.NativeColumns.toLocalDate;
import static com.cantte.cetus.persistence.NativeColumns.toOffsetDateTime;

import com.cantte.cetus.api.metrics.MetricsViews.AlertsView;
import com.cantte.cetus.api.metrics.MetricsViews.AmountView;
import com.cantte.cetus.api.metrics.MetricsViews.CertificateAlertView;
import com.cantte.cetus.api.metrics.MetricsViews.DayView;
import com.cantte.cetus.api.metrics.MetricsViews.MetricsView;
import com.cantte.cetus.api.metrics.MetricsViews.RangeAlertView;
import com.cantte.cetus.api.metrics.MetricsViews.RuleView;
import com.cantte.cetus.api.metrics.MetricsViews.StatusCountsView;
import com.cantte.cetus.api.metrics.MetricsViews.ValidationTimeView;
import com.cantte.cetus.domain.dian.DianRule;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * An account's documents of one environment issued in a period, by issue date (Colombia), as the console's
 * document list filters them; and the certificates and ranges of its issuers that need attention.
 */
@ApplicationScoped
public class ConsoleMetrics {

    /** The longest period one request reads, while documents are aggregated on each request. */
    public static final int PERIOD_DAYS_MAX = 366;

    static final int RULES_PER_KIND = 10;

    /** The account health notices' first marks (see AccountHealthChecks in the worker). */
    static final int CERTIFICATE_DAYS = 30;

    static final int RANGE_SHARE_PERCENT = 80;
    static final int RESOLUTION_DAYS = 30;

    private static final String PERIOD = """
            d.account_id = :account AND d.environment = :environment AND d.issue_date BETWEEN :from AND :to""";

    @Inject
    EntityManager em;

    public MetricsView metrics(UUID accountId, Environment environment, LocalDate from, LocalDate to) {
        Scope scope = new Scope(accountId, environment, from, to);
        Map<LocalDate, Map<DocumentStatus, Long>> byDay = byDay(scope);
        List<DayView> days = from.datesUntil(to.plusDays(1))
                .map(date -> new DayView(date, counts(byDay.getOrDefault(date, Map.of()))))
                .toList();
        Map<DocumentStatus, Long> overall = new EnumMap<>(DocumentStatus.class);
        byDay.values().forEach(day -> day.forEach((status, count) -> overall.merge(status, count, Long::sum)));
        StatusCountsView totals = counts(overall);
        long verdicts = totals.accepted() + totals.rejected();
        Double acceptanceRate = verdicts == 0 ? null : (double) totals.accepted() / verdicts;
        return new MetricsView(
                environment, from, to, totals, acceptanceRate, days, amounts(scope), validation(scope), rules(scope));
    }

    private Map<LocalDate, Map<DocumentStatus, Long>> byDay(Scope scope) {
        Map<LocalDate, Map<DocumentStatus, Long>> days = new TreeMap<>();
        rows(
                        "SELECT d.issue_date, d.status, count(*) FROM billing.documents d WHERE " + PERIOD
                                + " GROUP BY d.issue_date, d.status",
                        scope)
                .forEach(row -> days.computeIfAbsent(toLocalDate(row[0]), date -> new EnumMap<>(DocumentStatus.class))
                        .put(DocumentStatus.valueOf((String) row[1]), count(row[2])));
        return days;
    }

    private enum Outcome {
        ACCEPTED,
        REJECTED,
        FAILED,
        IN_PROGRESS;

        static Outcome of(DocumentStatus status) {
            return switch (status) {
                case ACCEPTED -> ACCEPTED;
                case REJECTED -> REJECTED;
                case FAILED -> FAILED;
                case RECEIVED, PROCESSING, SUBMITTED -> IN_PROGRESS;
            };
        }
    }

    private static StatusCountsView counts(Map<DocumentStatus, Long> byStatus) {
        Map<Outcome, Long> byOutcome = new EnumMap<>(Outcome.class);
        byStatus.forEach((status, count) -> byOutcome.merge(Outcome.of(status), count, Long::sum));
        long accepted = byOutcome.getOrDefault(Outcome.ACCEPTED, 0L);
        long rejected = byOutcome.getOrDefault(Outcome.REJECTED, 0L);
        long failed = byOutcome.getOrDefault(Outcome.FAILED, 0L);
        long inProgress = byOutcome.getOrDefault(Outcome.IN_PROGRESS, 0L);
        return new StatusCountsView(accepted, rejected, failed, inProgress, accepted + rejected + failed + inProgress);
    }

    private List<AmountView> amounts(Scope scope) {
        Map<String, Map<DocumentType, BigDecimal>> byCurrency = new TreeMap<>();
        rows(
                        "SELECT d.currency, d.document_type, sum(d.payable_amount) FROM billing.documents d WHERE "
                                + PERIOD + " AND d.status = 'ACCEPTED' GROUP BY d.currency, d.document_type",
                        scope)
                .forEach(row -> byCurrency
                        .computeIfAbsent(row[0].toString().strip(), currency -> new EnumMap<>(DocumentType.class))
                        .put(DocumentType.valueOf((String) row[1]), (BigDecimal) row[2]));
        return byCurrency.entrySet().stream()
                .map(entry -> {
                    Map<DocumentType, BigDecimal> sums = entry.getValue();
                    BigDecimal invoiced = sums.getOrDefault(DocumentType.INVOICE, BigDecimal.ZERO);
                    BigDecimal debited = sums.getOrDefault(DocumentType.DEBIT_NOTE, BigDecimal.ZERO);
                    BigDecimal credited = sums.getOrDefault(DocumentType.CREDIT_NOTE, BigDecimal.ZERO);
                    return new AmountView(
                            entry.getKey(),
                            invoiced,
                            debited,
                            credited,
                            invoiced.add(debited).subtract(credited));
                })
                .toList();
    }

    private ValidationTimeView validation(Scope scope) {
        Object[] row = rows("""
                        SELECT count(*), avg(seconds), percentile_cont(0.95) WITHIN GROUP (ORDER BY seconds)
                        FROM (SELECT extract(epoch FROM d.validated_at - d.created_at) AS seconds
                              FROM billing.documents d
                              WHERE %s AND d.status IN ('ACCEPTED', 'REJECTED') AND d.validated_at IS NOT NULL) v
                        """.formatted(PERIOD), scope).findFirst().orElseThrow();
        return new ValidationTimeView(count(row[0]), seconds(row[1]), seconds(row[2]));
    }

    private List<RuleView> rules(Scope scope) {
        return rows("""
                        SELECT rule, kind, documents, message, seen_at FROM (
                            SELECT r.rule, r.kind, count(*) AS documents,
                                   (array_agg(r.message ORDER BY d.validated_at DESC))[1] AS message,
                                   max(d.validated_at) AS seen_at,
                                   row_number() OVER (PARTITION BY r.kind ORDER BY count(*) DESC, r.rule) AS position
                            FROM billing.document_dian_rules r
                            JOIN billing.documents d ON d.id = r.document_id
                            WHERE %s
                            GROUP BY r.rule, r.kind
                        ) ranked
                        WHERE position <= :rules
                        ORDER BY kind, documents DESC, rule
                        """.formatted(PERIOD), scope, Map.of("rules", RULES_PER_KIND))
                .map(row -> new RuleView(
                        (String) row[0],
                        DianRule.Kind.valueOf((String) row[1]),
                        count(row[2]),
                        (String) row[3],
                        toOffsetDateTime(row[4])))
                .toList();
    }

    /** Nothing for the sandbox: its issuers sign with Cetus' certificate and number up to 999 999 999. */
    public AlertsView alerts(UUID accountId, Environment environment) {
        if (environment == Environment.SANDBOX) {
            return new AlertsView(List.of(), List.of());
        }
        LocalDate today = LocalDate.now(DianTime.ZONE);
        List<CertificateAlertView> certificates = query(
                        """
                        SELECT i.id, i.legal_name, c.valid_to, (c.valid_to AT TIME ZONE 'America/Bogota')::date
                        FROM billing.signing_certificates c
                        JOIN billing.issuers i ON i.id = c.issuer_id
                        WHERE i.account_id = :account AND i.environment = :environment AND i.status <> 'DISABLED'
                          AND c.active AND (c.valid_to AT TIME ZONE 'America/Bogota')::date <= :until
                        ORDER BY c.valid_to, i.legal_name
                        """,
                        Map.of(
                                "account", accountId,
                                "environment", environment.name(),
                                "until", today.plusDays(CERTIFICATE_DAYS)))
                .map(row -> new CertificateAlertView(
                        (UUID) row[0],
                        (String) row[1],
                        toOffsetDateTime(row[2]),
                        toLocalDate(row[3]).toEpochDay() - today.toEpochDay()))
                .toList();
        List<RangeAlertView> ranges = query("""
                        SELECT r.id, i.id, i.legal_name, r.document_type, r.prefix,
                               r.next_number - r.range_from, r.range_to - r.range_from + 1, r.valid_to
                        FROM billing.numbering_ranges r
                        JOIN billing.issuers i ON i.id = r.issuer_id
                        WHERE i.account_id = :account AND i.environment = :environment AND i.status <> 'DISABLED'
                          AND r.status = 'ACTIVE'
                        ORDER BY i.legal_name, r.document_type, r.prefix
                        """, Map.of("account", accountId, "environment", environment.name()))
                .map(row -> {
                    long used = count(row[5]);
                    long total = count(row[6]);
                    LocalDate validTo = row[7] == null ? null : toLocalDate(row[7]);
                    Long daysLeft = validTo == null ? null : validTo.toEpochDay() - today.toEpochDay();
                    boolean runningOut = used * 100 >= (long) RANGE_SHARE_PERCENT * total;
                    boolean expiring = daysLeft != null && daysLeft <= RESOLUTION_DAYS;
                    return new RangeAlertView(
                            (UUID) row[0],
                            (UUID) row[1],
                            (String) row[2],
                            DocumentType.valueOf((String) row[3]),
                            (String) row[4],
                            used,
                            total,
                            validTo,
                            daysLeft,
                            runningOut,
                            expiring);
                })
                .toList();
        return new AlertsView(certificates, ranges);
    }

    /** The documents of an account's environment issued between two days, both included. */
    private record Scope(UUID accountId, Environment environment, LocalDate from, LocalDate to) {}

    private Stream<Object[]> rows(String sql, Scope scope) {
        return rows(sql, scope, Map.of());
    }

    private Stream<Object[]> rows(String sql, Scope scope, Map<String, Object> parameters) {
        Map<String, Object> all = new TreeMap<>(parameters);
        all.put("account", scope.accountId());
        all.put("environment", scope.environment().name());
        all.put("from", scope.from());
        all.put("to", scope.to());
        return query(sql, all);
    }

    private Stream<Object[]> query(String sql, Map<String, Object> parameters) {
        Query query = em.createNativeQuery(sql, Object[].class);
        parameters.forEach(query::setParameter);
        List<?> rows = query.getResultList();
        return rows.stream().map(row -> (Object[]) row);
    }

    private static long count(Object value) {
        return ((Number) value).longValue();
    }

    private static Double seconds(Object value) {
        return value == null ? null : ((Number) value).doubleValue();
    }
}
