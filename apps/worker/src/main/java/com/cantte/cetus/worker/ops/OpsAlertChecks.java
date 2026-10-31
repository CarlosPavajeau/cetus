package com.cantte.cetus.worker.ops;

import com.cantte.cetus.domain.billing.VatThreshold;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.worker.notifications.Dates;
import com.cantte.cetus.worker.ops.OpsAlert.Category;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.text.NumberFormat;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
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

    @ConfigProperty(name = "cetus.billing.uvt-value-cop")
    Optional<Long> uvtValueCop;

    @ConfigProperty(name = "cetus.billing.vat-threshold-uvt")
    Optional<Integer> vatThresholdUvt;

    @ConfigProperty(name = "cetus.billing.vat-threshold-alert-percents")
    List<Integer> vatAlertPercents;

    @ConfigProperty(name = "cetus.billing.invoice-issuer-id")
    Optional<UUID> invoiceIssuerId;

    @ConfigProperty(name = "cetus.billing.invoice-due-after")
    Duration invoiceDueAfter;

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

    /**
     * Each share of the VAT threshold the year's paid orders reached, once a year: the key carries the year and the
     * share, and the category is never forgotten (see {@link Category#forgotten()}), so a refund that takes the
     * income back under a share does not make it report again. In January the previous year is checked too: what
     * it took in after the last daily run of December is reported then, against the threshold configured now.
     * Nothing without the UVT and the threshold configured.
     */
    List<OpsAlert> vatThreshold(LocalDate today) {
        Optional<VatThreshold> threshold = uvtValueCop.flatMap(
                value -> vatThresholdUvt.map(units -> new VatThreshold(value, units, vatAlertPercents)));
        if (threshold.isEmpty()) {
            return List.of();
        }
        List<Integer> years =
                today.getMonthValue() == 1 ? List.of(today.getYear() - 1, today.getYear()) : List.of(today.getYear());
        return years.stream()
                .flatMap(year -> vatThreshold(threshold.get(), year).stream())
                .toList();
    }

    private static List<OpsAlert> vatThreshold(VatThreshold threshold, int year) {
        long revenueCents = BillingOrderEntity.revenueCents(
                LocalDate.of(year, 1, 1).atStartOfDay(Dates.BOGOTA).toOffsetDateTime(),
                LocalDate.of(year + 1, 1, 1).atStartOfDay(Dates.BOGOTA).toOffsetDateTime());
        NumberFormat pesos = NumberFormat.getIntegerInstance(Locale.of("es", "CO"));
        return threshold.crossed(revenueCents).stream()
                .map(percent -> OpsAlert.of(
                        Category.VAT_THRESHOLD,
                        year + ":" + percent,
                        false,
                        "Los ingresos de %d llegan a $%s, el %d %% del tope de no responsable de IVA ($%s)"
                                .formatted(
                                        year,
                                        pesos.format(revenueCents / 100),
                                        percent,
                                        pesos.format(threshold.limitCents() / 100))))
                .toList();
    }

    /** Credit lots whose remaining is not the sum of their movements: a write went around the ledger. */
    List<OpsAlert> creditLedgerMismatches() {
        return rows("""
                SELECT g.id::text, g.account_id::text, g.remaining::text, coalesce(sum(m.quantity), 0)::text
                FROM billing.credit_grants g
                LEFT JOIN billing.credit_movements m ON m.grant_id = g.id
                GROUP BY g.id
                HAVING g.remaining <> coalesce(sum(m.quantity), 0)
                """, Map.of()).stream()
                .map(r -> OpsAlert.of(
                        Category.CREDIT_LEDGER_MISMATCH,
                        r[0],
                        false,
                        "El lote de créditos %s de la cuenta %s tiene %s y sus movimientos suman %s"
                                .formatted(r[0], r[1], r[2], r[3])))
                .toList();
    }

    /**
     * Paid orders whose invoice is not accepted a while after the payment: not issued yet, rejected, or stuck. A
     * rejected invoice is not issued again on its own; a person fixes what the DIAN refused first. Nothing without
     * the billing issuer configured.
     */
    List<OpsAlert> billingInvoicesMissing() {
        if (invoiceIssuerId.isEmpty()) {
            return List.of();
        }
        return rows("""
                SELECT o.id::text, o.reference, coalesce(d.prefix || d.number || ' ' || d.status, 'sin factura')
                FROM billing.billing_orders o
                LEFT JOIN billing.documents d ON d.id = o.invoice_document_id
                WHERE o.status = 'PAID' AND o.paid_at < :before AND (d.id IS NULL OR d.status <> 'ACCEPTED')
                ORDER BY o.paid_at
                """, Map.of("before", OffsetDateTime.now().minus(invoiceDueAfter))).stream()
                .map(r -> OpsAlert.of(
                        Category.BILLING_INVOICE_MISSING,
                        r[0],
                        false,
                        "La orden pagada %s (%s) no tiene su factura aceptada: %s".formatted(r[1], r[0], r[2])))
                .toList();
    }

    /** Orders a payment left for a person: another amount, or an approval or a void that does not fit. */
    List<OpsAlert> paymentsToReview() {
        return rows("""
                SELECT o.id::text, o.reference, o.review_reason
                FROM billing.billing_orders o
                WHERE o.review_reason IS NOT NULL
                ORDER BY o.updated_at
                """, Map.of()).stream()
                .map(r -> OpsAlert.of(
                        Category.PAYMENT_REVIEW,
                        r[0],
                        false,
                        "Orden %s (%s) requiere revisión: %s".formatted(r[1], r[0], shorten(r[2]))))
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
