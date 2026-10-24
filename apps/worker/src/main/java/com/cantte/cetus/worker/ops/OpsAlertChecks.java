package com.cantte.cetus.worker.ops;

import com.cantte.cetus.worker.ops.OpsAlert.Category;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/** The queries behind each alert category. Ids and dates come back as text: they only go into an email. */
@ApplicationScoped
public class OpsAlertChecks {

    /** A dead job is reported while it is this recent; older ones were already reported or are history. */
    private static final Duration DEAD_JOB_WINDOW = Duration.ofDays(7);

    @Inject
    EntityManager em;

    @ConfigProperty(name = "cetus.alerts.stuck-after")
    Duration stuckAfter;

    @ConfigProperty(name = "cetus.alerts.expiry-window")
    Duration expiryWindow;

    @ConfigProperty(name = "cetus.alerts.range-min-available")
    double rangeMinAvailable;

    /** Jobs the worker gave up on. A dead PROCESS_DOCUMENT also leaves its document FAILED for good. */
    List<OpsAlert> deadJobs() {
        return rows("""
                SELECT j.id::text, j.job_type, j.attempts::text, coalesce(j.last_error, ''),
                       coalesce(d.environment || ' ' || d.document_type || ' ' || d.prefix || d.number, j.reference_id::text, '')
                FROM billing.jobs j
                LEFT JOIN billing.documents d ON d.id = j.reference_id
                WHERE j.status = 'DEAD' AND j.updated_at > :since
                ORDER BY j.updated_at
                """, Map.of("since", OffsetDateTime.now().minus(DEAD_JOB_WINDOW))).stream()
                .map(r -> OpsAlert.of(
                        Category.JOB_DEAD,
                        r[0],
                        false,
                        "Job %s %s (%s) murió tras %s intentos: %s".formatted(r[1], r[0], r[4], r[2], shorten(r[3]))))
                .toList();
    }

    /**
     * Documents that should have reached the DIAN by now: received or processing (the worker is down or
     * slow), or failing and still being retried.
     */
    List<OpsAlert> stuckDocuments() {
        return rows("""
                SELECT d.id::text, d.environment, d.document_type, d.prefix || d.number, d.status,
                       to_char(d.updated_at AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI'),
                       coalesce(d.dian_status_message, '')
                FROM billing.documents d
                WHERE d.status IN ('RECEIVED', 'PROCESSING', 'FAILED') AND d.updated_at < :since
                  AND EXISTS (SELECT 1 FROM billing.jobs j WHERE j.reference_id = d.id
                              AND j.job_type = 'PROCESS_DOCUMENT' AND j.status IN ('PENDING', 'RUNNING'))
                ORDER BY d.updated_at
                """, Map.of("since", OffsetDateTime.now().minus(stuckAfter))).stream()
                .map(r -> OpsAlert.of(
                        Category.DOCUMENT_STUCK,
                        r[0],
                        true,
                        "%s %s %s (%s) sigue en %s desde %s %s"
                                .formatted(r[1], r[2], r[3], r[0], r[4], r[5], shorten(r[6]))
                                .trim()))
                .toList();
    }

    /** Invoice ranges whose prefix, numbers or technical key differ from the DIAN's, or could not be checked. */
    List<OpsAlert> unverifiedRanges() {
        return rows("""
                SELECT r.id::text, i.environment, i.legal_name, i.nit, r.prefix, r.verification_status,
                       coalesce(r.verification_error, '')
                FROM billing.numbering_ranges r
                JOIN billing.issuers i ON i.id = r.issuer_id
                WHERE r.status = 'ACTIVE' AND i.environment = 'LIVE' AND r.verification_status IN ('MISMATCH', 'ERROR')
                """, Map.of()).stream()
                .map(r -> OpsAlert.of(
                        Category.RANGE_UNVERIFIED,
                        r[0],
                        true,
                        "%s %s (NIT %s): el rango %s no coincide con la DIAN (%s): %s"
                                .formatted(r[1], r[2], r[3], prefix(r[4]), r[5], shorten(r[6]))))
                .toList();
    }

    List<OpsAlert> expiringCertificates() {
        return rows("""
                SELECT c.id::text, i.environment, i.legal_name, i.nit,
                       to_char(c.valid_to AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD')
                FROM billing.signing_certificates c
                JOIN billing.issuers i ON i.id = c.issuer_id
                WHERE c.active AND i.status <> 'DISABLED' AND c.valid_to < :until
                ORDER BY c.valid_to
                """, Map.of("until", OffsetDateTime.now().plus(expiryWindow))).stream()
                .map(r -> OpsAlert.of(
                        Category.CERTIFICATE_EXPIRING,
                        r[0],
                        true,
                        "%s %s (NIT %s): el certificado de firma vence el %s".formatted(r[1], r[2], r[3], r[4])))
                .toList();
    }

    /** Active ranges with less than {@code range-min-available} of their numbers left, or about to expire. */
    List<OpsAlert> rangesRunningOut() {
        return rows(
                        """
                SELECT r.id::text, i.environment, i.legal_name, i.nit, r.document_type, r.prefix,
                       (r.range_to - r.next_number + 1)::text, (r.range_to - r.range_from + 1)::text,
                       coalesce(', vigente hasta ' || to_char(r.valid_to, 'YYYY-MM-DD'), '')
                FROM billing.numbering_ranges r
                JOIN billing.issuers i ON i.id = r.issuer_id
                WHERE r.status = 'ACTIVE' AND i.status <> 'DISABLED'
                  AND ((r.range_to - r.next_number + 1) < :ratio * (r.range_to - r.range_from + 1)
                       OR r.valid_to < :until)
                ORDER BY r.valid_to
                """,
                        Map.of(
                                "ratio",
                                rangeMinAvailable,
                                "until",
                                LocalDate.now().plusDays(expiryWindow.toDays())))
                .stream()
                .map(r -> OpsAlert.of(
                        Category.RANGE_RUNNING_OUT,
                        r[0],
                        true,
                        "%s %s (NIT %s): al rango %s %s le quedan %s de %s números%s"
                                .formatted(r[1], r[2], r[3], r[4], prefix(r[5]), r[6], r[7], r[8])))
                .toList();
    }

    @SuppressWarnings("unchecked")
    private List<String[]> rows(String sql, Map<String, Object> parameters) {
        var query = em.createNativeQuery(sql, Object[].class);
        parameters.forEach(query::setParameter);
        return ((List<Object[]>) query.getResultList())
                .stream()
                        .map(row -> Arrays.stream(row).map(String::valueOf).toArray(String[]::new))
                        .toList();
    }

    private static String prefix(String prefix) {
        return prefix == null || prefix.isEmpty() ? "sin prefijo" : prefix;
    }

    private static String shorten(String text) {
        return text.length() > 300 ? text.substring(0, 300) + "…" : text;
    }
}
