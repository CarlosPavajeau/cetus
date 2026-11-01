package com.cantte.cetus.api.metrics;

import com.cantte.cetus.domain.dian.DianRule;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public final class MetricsViews {

    private MetricsViews() {}

    @Schema(description = "Documents by outcome; in progress is received, processing or submitted")
    public record StatusCountsView(long accepted, long rejected, long failed, long inProgress, long total) {}

    @Schema(description = "Documents issued on a day, by outcome")
    public record DayView(LocalDate date, StatusCountsView documents) {}

    @Schema(description = "What the documents the DIAN accepted add up to, in one currency")
    public record AmountView(
            String currency,
            BigDecimal invoiced,
            BigDecimal debited,
            BigDecimal credited,

            @Schema(description = "Invoiced plus debited minus credited")
            BigDecimal net) {}

    @Schema(description = "From the document's creation to the DIAN's verdict")
    public record ValidationTimeView(
            @Schema(description = "Documents with a verdict")
            long documents,

            @Schema(nullable = true) Double secondsAverage,

            @Schema(nullable = true) Double secondsP95) {}

    @Schema(description = "A DIAN rule and how many of the period's documents it was reported for")
    public record RuleView(
            String rule,
            DianRule.Kind kind,
            long documents,

            @Schema(description = "The DIAN's message in the latest verdict")
            String message,

            @Schema(description = "The latest verdict that reported it")
            OffsetDateTime seenAt) {}

    @Schema(description = "An environment's documents issued in a period, by issue date in Colombia")
    public record MetricsView(
            Environment environment,
            LocalDate from,
            LocalDate to,
            StatusCountsView totals,

            @Schema(nullable = true, description = "Accepted over accepted plus rejected; null with no verdict")
            Double acceptanceRate,

            @Schema(description = "Every day of the period, oldest first")
            List<DayView> days,

            List<AmountView> amounts,
            ValidationTimeView validation,

            @Schema(description = "The most frequent rules of each kind, most frequent first")
            List<RuleView> rules) {}

    @Schema(description = "An issuer's signing certificate that expires soon or has expired")
    public record CertificateAlertView(
            UUID issuerId,
            String issuerName,
            OffsetDateTime validTo,

            @Schema(description = "Days left in Colombia; negative once it expired")
            long daysLeft) {}

    @Schema(description = "An active numbering range and how much of it was used")
    public record RangeAlertView(
            UUID id,
            UUID issuerId,
            String issuerName,
            DocumentType documentType,

            @Schema(nullable = true) String prefix,

            long used,
            long total,

            @Schema(nullable = true) LocalDate validTo,

            @Schema(nullable = true, description = "Days left of its resolution in Colombia")
            Long daysLeft,

            @Schema(description = "True from 80 % of its numbers used")
            boolean runningOut,

            @Schema(description = "True from 30 days before its resolution ends")
            boolean expiring) {}

    @Schema(description = "What needs attention in an environment's issuers")
    public record AlertsView(List<CertificateAlertView> certificates, List<RangeAlertView> ranges) {}
}
