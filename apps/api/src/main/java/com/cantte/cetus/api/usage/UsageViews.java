package com.cantte.cetus.api.usage;

import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.persistence.entity.PlanEntity;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public final class UsageViews {

    private UsageViews() {}

    @Schema(description = "What a plan includes. A null limit is no limit; a null price is agreed by contract.")
    public record PlanView(
            String code,
            String name,
            @Schema(nullable = true) Long priceMonthlyCop,

            @Schema(nullable = true, description = "Billable documents included each month")
            Integer documentsIncluded,

            @Schema(nullable = true, description = "Price of each document above the included ones")
            Integer priceOverageCop,

            @Schema(nullable = true, description = "Production issuers (NIT) the account may have")
            Integer issuersIncluded,

            @Schema(nullable = true, description = "Production API requests a minute, shared by the account's keys")
            Integer requestsPerMinute) {

        public static PlanView from(PlanEntity plan) {
            return new PlanView(
                    plan.code,
                    plan.name,
                    plan.priceMonthlyCop,
                    plan.documentsIncluded,
                    plan.priceOverageCop,
                    plan.issuersIncluded,
                    plan.requestsPerMinute);
        }
    }

    public record DocumentCountView(DocumentType documentType, long count) {}

    @Schema(description = "Billable documents (production, accepted by the DIAN) of a month against the plan")
    public record PeriodUsageView(
            @Schema(description = "Calendar month in Colombia, YYYY-MM")
            String period,

            PlanView plan,
            List<DocumentCountView> documents,
            long total,

            @Schema(description = "Documents above the plan's included ones; 0 without a limit")
            long overage,

            @Schema(nullable = true, description = "Overage times its price, in COP; null when the plan has no price")
            Long costOverageCop) {}

    public record MonthTotalView(
            @Schema(description = "Calendar month in Colombia, YYYY-MM")
            String period,

            long total) {}

    @Schema(description = "The account's plan and its billable documents: this month in detail, and the months before")
    public record UsageView(
            PeriodUsageView current,

            @Schema(description = "Production issuers the account has, against the plan's included ones")
            long issuersLive,

            @Schema(description = "The last months, oldest first, this month included")
            List<MonthTotalView> months) {}
}
