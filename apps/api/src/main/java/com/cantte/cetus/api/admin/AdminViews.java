package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.console.IssuerViews;
import com.cantte.cetus.api.usage.UsageViews.PeriodUsageView;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.AccountEntity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public final class AdminViews {

    private AdminViews() {}

    public record AccountSummaryView(
            UUID id,

            @Schema(description = "Better Auth organization id")
            String organizationId,

            String name,
            AccountEntity.Status status,
            String plan,
            OffsetDateTime createdAt,
            long issuers,

            @Schema(description = "Production issuers already enabled at the DIAN")
            long liveIssuersEnabled,

            @Schema(description = "Production documents the DIAN accepted this month (Colombia time)")
            long liveDocumentsThisMonth,

            @Schema(description = "Documents rejected or failed in the last 7 days")
            long recentFailures,

            @Schema(nullable = true) OffsetDateTime lastFailureAt) {}

    public record AccountPage(
            List<AccountSummaryView> items,
            @Schema(nullable = true) UUID nextCursor) {}

    public record AccountDetailView(
            UUID id,
            String organizationId,
            String name,
            AccountEntity.Status status,
            String plan,
            @Schema(nullable = true) String statusReason,
            @Schema(nullable = true) OffsetDateTime statusChangedAt,

            @Schema(nullable = true, description = "Better Auth user id")
            String statusChangedBy,

            OffsetDateTime createdAt,
            List<IssuerViews.IssuerView> issuers,

            @Schema(description = "Documents created this month in every environment, by status")
            List<UsageCountView> usageThisMonth,

            @Schema(description = "Billable documents this month against the account's plan")
            PeriodUsageView billableThisMonth,

            List<FailedDocumentView> recentFailures) {
        static AccountDetailView of(
                AccountEntity account,
                List<IssuerViews.IssuerView> issuers,
                List<UsageCountView> usage,
                PeriodUsageView billable,
                List<FailedDocumentView> failures) {
            return new AccountDetailView(
                    account.id,
                    account.organizationId,
                    account.name,
                    account.status,
                    account.plan,
                    account.statusReason,
                    account.statusChangedAt,
                    account.statusChangedBy,
                    account.createdAt,
                    issuers,
                    usage,
                    billable,
                    failures);
        }
    }

    public record UsageCountView(
            Environment environment, DocumentType documentType, DocumentStatus status, long count) {}

    public record FailedDocumentView(
            UUID id,
            UUID issuerId,
            Environment environment,
            DocumentType documentType,

            @Schema(description = "Prefix and consecutive, e.g. SETP990000001")
            String number,

            DocumentStatus status,
            @Schema(nullable = true) String dianStatusCode,
            @Schema(nullable = true) String dianStatusMessage,
            List<String> dianErrors,
            OffsetDateTime updatedAt) {}

    /** A plan change says why, like a status change; it is audited with the previous plan. */
    public record PlanChangeRequest(
            @NotBlank String plan,
            @NotBlank @Size(min = 3, max = 500) String reason) {}

    /** Suspending or reactivating an account always says why; the account's members see the reason. */
    public record StatusChangeRequest(
            @NotBlank @Size(min = 3, max = 500) String reason) {}
}
