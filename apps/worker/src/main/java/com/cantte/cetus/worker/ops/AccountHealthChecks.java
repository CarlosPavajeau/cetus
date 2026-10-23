package com.cantte.cetus.worker.ops;

import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.worker.notifications.Dates;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * What each account's contacts should hear about today. Each notice is named by the fact and the
 * threshold it crossed (for example, a certificate's 7-day mark), so it goes out once per threshold.
 */
@ApplicationScoped
public class AccountHealthChecks {

    private static final Logger LOG = Logger.getLogger(AccountHealthChecks.class);

    /** Days before a certificate expires when its contacts hear about it, the earliest first. */
    static final List<Integer> CERTIFICATE_DAYS = List.of(30, 7, 1);
    /** Days before a range's resolution expires. */
    static final List<Integer> RESOLUTION_DAYS = List.of(30, 7);
    /** Share of a range used, in percent. */
    static final List<Integer> RANGE_USAGE = List.of(80, 95);

    /** A notice to request. */
    public record Notice(UUID accountId, NotificationKind kind, String dedupKey, Map<String, String> data) {
    }

    @Inject
    EntityManager em;

    @ConfigProperty(name = "cetus.account-health.rejections-min")
    int rejectionsMin;
    @ConfigProperty(name = "cetus.account-health.rejections-rate")
    double rejectionsRate;

    /** Every check; one that fails is logged and skipped, so it does not hold back the notices of the others. */
    List<Notice> all(LocalDate today) {
        List<Supplier<List<Notice>>> checks = List.of(() -> expiringCertificates(today), this::rangesRunningOut,
                () -> expiringResolutions(today), () -> rejectionSpikes(today));
        List<Notice> notices = new ArrayList<>();
        for (Supplier<List<Notice>> check : checks) {
            try {
                notices.addAll(check.get());
            } catch (RuntimeException e) {
                LOG.errorf(e, "An account health check failed; the others still run");
            }
        }
        return notices;
    }

    /** Active certificates of issuers in use, from 30 days before they expire. */
    List<Notice> expiringCertificates(LocalDate today) {
        return rows("""
                SELECT i.account_id, c.id, i.id, i.legal_name, i.nit, i.environment,
                       (c.valid_to AT TIME ZONE 'America/Bogota')::date
                FROM billing.signing_certificates c
                JOIN billing.issuers i ON i.id = c.issuer_id
                JOIN billing.accounts a ON a.id = i.account_id
                WHERE c.active AND i.status <> 'DISABLED' AND a.status <> 'CLOSED'
                  AND c.valid_to > now() AND (c.valid_to AT TIME ZONE 'America/Bogota')::date <= :until
                """, Map.of("until", today.plusDays(CERTIFICATE_DAYS.get(0)))).stream()
                .map(r -> {
                    LocalDate validTo = date(r[6]);
                    long days = Math.max(0, validTo.toEpochDay() - today.toEpochDay());
                    int mark = lowestMark(CERTIFICATE_DAYS, days);
                    return new Notice((UUID) r[0], NotificationKind.CERTIFICATE_EXPIRING,
                            "cert_expiring:%s:%dd".formatted(r[1], mark),
                            Map.of("issuerId", r[2].toString(), "issuer", (String) r[3], "nit", (String) r[4],
                                    "environment", (String) r[5], "validTo", Dates.day(validTo),
                                    "days", String.valueOf(days)));
                })
                .toList();
    }

    /** Active LIVE ranges that used 80 % or more of their numbers. */
    List<Notice> rangesRunningOut() {
        return rows("""
                SELECT i.account_id, r.id, i.id, i.legal_name, i.nit, r.prefix,
                       r.next_number - r.range_from, r.range_to - r.range_from + 1
                FROM billing.numbering_ranges r
                JOIN billing.issuers i ON i.id = r.issuer_id
                JOIN billing.accounts a ON a.id = i.account_id
                WHERE r.status = 'ACTIVE' AND i.environment = 'LIVE' AND i.status <> 'DISABLED' AND a.status <> 'CLOSED'
                  AND (r.next_number - r.range_from) >= :share * (r.range_to - r.range_from + 1)
                """, Map.of("share", RANGE_USAGE.get(0) / 100.0)).stream()
                .map(r -> {
                    long used = ((Number) r[6]).longValue();
                    long total = ((Number) r[7]).longValue();
                    int mark = RANGE_USAGE.stream().filter(t -> used * 100 >= (long) t * total)
                            .reduce((a, b) -> b).orElseThrow();
                    return new Notice((UUID) r[0], NotificationKind.RANGE_RUNNING_OUT,
                            "range_usage:%s:%d".formatted(r[1], mark),
                            Map.of("issuerId", r[2].toString(), "issuer", (String) r[3], "nit", (String) r[4],
                                    "prefix", r[5] == null ? "" : (String) r[5], "threshold", String.valueOf(mark),
                                    "remaining", String.valueOf(Math.max(0, total - used)),
                                    "total", String.valueOf(total)));
                })
                .toList();
    }

    /** Active LIVE ranges whose resolution ends within 30 days. */
    List<Notice> expiringResolutions(LocalDate today) {
        return rows("""
                SELECT i.account_id, r.id, i.id, i.legal_name, i.nit, r.prefix, r.resolution_number, r.valid_to
                FROM billing.numbering_ranges r
                JOIN billing.issuers i ON i.id = r.issuer_id
                JOIN billing.accounts a ON a.id = i.account_id
                WHERE r.status = 'ACTIVE' AND i.environment = 'LIVE' AND i.status <> 'DISABLED' AND a.status <> 'CLOSED'
                  AND r.valid_to >= :today AND r.valid_to <= :until
                """, Map.of("today", today, "until", today.plusDays(RESOLUTION_DAYS.get(0)))).stream()
                .map(r -> {
                    LocalDate validTo = date(r[7]);
                    long days = validTo.toEpochDay() - today.toEpochDay();
                    int mark = lowestMark(RESOLUTION_DAYS, days);
                    return new Notice((UUID) r[0], NotificationKind.RESOLUTION_EXPIRING,
                            "resolution_expiring:%s:%dd".formatted(r[1], mark),
                            Map.of("issuerId", r[2].toString(), "issuer", (String) r[3], "nit", (String) r[4],
                                    "prefix", r[5] == null ? "" : (String) r[5],
                                    // A range can be saved without its resolution number.
                                    "resolution", r[6] == null ? "" : (String) r[6],
                                    "validTo", Dates.day(validTo), "days", String.valueOf(days)));
                })
                .toList();
    }

    /**
     * Accounts whose LIVE documents the DIAN rejected yesterday (Bogotá) at least {@code rejections-min} times
     * and at {@code rejections-rate} or more of its verdicts that day. Counted by the day of the verdict
     * (validated_at), so a document created one day and rejected after the next run still counts once.
     */
    List<Notice> rejectionSpikes(LocalDate today) {
        LocalDate day = today.minusDays(1);
        return rows("""
                SELECT d.account_id, count(*) FILTER (WHERE d.status = 'REJECTED'), count(*)
                FROM billing.documents d
                JOIN billing.accounts a ON a.id = d.account_id
                WHERE d.environment = 'LIVE' AND d.status IN ('ACCEPTED', 'REJECTED') AND a.status <> 'CLOSED'
                  AND d.validated_at >= :from AND d.validated_at < :to
                GROUP BY d.account_id
                HAVING count(*) FILTER (WHERE d.status = 'REJECTED') >= :min
                   AND count(*) FILTER (WHERE d.status = 'REJECTED') >= :rate * count(*)
                """, Map.of("from", day.atStartOfDay(Dates.BOGOTA).toOffsetDateTime(),
                "to", today.atStartOfDay(Dates.BOGOTA).toOffsetDateTime(), "min", rejectionsMin,
                "rate", rejectionsRate)).stream()
                .map(r -> {
                    long rejected = ((Number) r[1]).longValue();
                    long total = ((Number) r[2]).longValue();
                    return new Notice((UUID) r[0], NotificationKind.REJECTIONS_SPIKE,
                            "rejections_spike:%s:%s".formatted(r[0], day),
                            Map.of("date", Dates.day(day), "rejected", String.valueOf(rejected),
                                    "total", String.valueOf(total),
                                    "rate", BigDecimal.valueOf(rejected * 100.0 / total)
                                            .setScale(0, RoundingMode.HALF_UP).toPlainString()));
                })
                .toList();
    }

    /** The smallest mark the remaining days already reached (marks are in descending order). */
    private static int lowestMark(List<Integer> marks, long days) {
        return marks.stream().filter(mark -> days <= mark).reduce((a, b) -> b).orElseThrow();
    }

    private static LocalDate date(Object value) {
        return value instanceof Date sql ? sql.toLocalDate() : (LocalDate) value;
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> rows(String sql, Map<String, Object> parameters) {
        var query = em.createNativeQuery(sql, Object[].class);
        parameters.forEach(query::setParameter);
        return query.getResultList();
    }
}
