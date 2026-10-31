package com.cantte.cetus.api.usage;

import com.cantte.cetus.domain.model.DocumentType;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public final class UsageViews {

    private UsageViews() {}

    public record DocumentCountView(DocumentType documentType, long count) {}

    @Schema(description = "Billable documents (production, accepted by the DIAN) of a month")
    public record PeriodUsageView(
            @Schema(description = "Calendar month in Colombia, YYYY-MM")
            String period,

            List<DocumentCountView> documents,
            long total) {}

    public record MonthTotalView(
            @Schema(description = "Calendar month in Colombia, YYYY-MM")
            String period,

            long total) {}

    @Schema(description = "The account's billable documents: this month in detail, and the months before")
    public record UsageView(
            PeriodUsageView current,

            @Schema(description = "Production issuers the account has")
            long issuersLive,

            @Schema(description = "The last months, newest first, this month included")
            List<MonthTotalView> months,

            RequestLimitsView requests) {}

    @Schema(description = "The production API limits that apply to the account now")
    public record RequestLimitsView(
            double requestsPerSecond,

            @Schema(description = "Requests that may be made at once")
            int requestsBurst,

            @Schema(description = "True when each key has these limits; false when the account's keys share them")
            boolean perKey) {}
}
