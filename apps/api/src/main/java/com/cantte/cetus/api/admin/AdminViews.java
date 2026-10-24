package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.console.IssuerViews;
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
            @Schema(required = true) UUID id,

            @Schema(required = true, description = "Better Auth organization id")
            String organizationId,

            @Schema(required = true) String name,
            @Schema(required = true) String status,
            @Schema(required = true) String plan,
            @Schema(required = true) OffsetDateTime createdAt,
            @Schema(required = true) long issuers,

            @Schema(required = true, description = "Production issuers already enabled at the DIAN")
            long liveIssuersEnabled,

            @Schema(required = true, description = "Production documents created this month (Colombia time)")
            long liveDocumentsThisMonth,

            @Schema(required = true, description = "Documents rejected or failed in the last 7 days")
            long recentFailures,

            @Schema(required = true, nullable = true) OffsetDateTime lastFailureAt) {}

    public record AccountPage(
            @Schema(required = true) List<AccountSummaryView> items,
            @Schema(required = true, nullable = true) UUID nextCursor) {}

    public record AccountDetailView(
            @Schema(required = true) UUID id,
            @Schema(required = true) String organizationId,
            @Schema(required = true) String name,
            @Schema(required = true) String status,
            @Schema(required = true) String plan,
            @Schema(required = true, nullable = true) String statusReason,
            @Schema(required = true, nullable = true) OffsetDateTime statusChangedAt,

            @Schema(required = true, nullable = true, description = "Better Auth user id")
            String statusChangedBy,

            @Schema(required = true) OffsetDateTime createdAt,
            @Schema(required = true) List<IssuerViews.IssuerView> issuers,
            @Schema(required = true) List<UsageCountView> usageThisMonth,
            @Schema(required = true) List<FailedDocumentView> recentFailures) {
        static AccountDetailView of(
                AccountEntity account,
                List<IssuerViews.IssuerView> issuers,
                List<UsageCountView> usage,
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
                    failures);
        }
    }

    public record UsageCountView(
            @Schema(required = true) Environment environment,
            @Schema(required = true) DocumentType documentType,
            @Schema(required = true) String status,
            @Schema(required = true) long count) {}

    public record FailedDocumentView(
            @Schema(required = true) UUID id,
            @Schema(required = true) UUID issuerId,
            @Schema(required = true) Environment environment,
            @Schema(required = true) DocumentType documentType,

            @Schema(required = true, description = "Prefix and consecutive, e.g. SETP990000001")
            String number,

            @Schema(required = true) String status,
            @Schema(required = true, nullable = true) String dianStatusCode,
            @Schema(required = true, nullable = true) String dianStatusMessage,
            @Schema(required = true) List<String> dianErrors,
            @Schema(required = true) OffsetDateTime updatedAt) {}

    /** Suspending or reactivating an account always says why; the account's members see the reason. */
    public record StatusChangeRequest(
            @NotBlank @Size(min = 3, max = 500) String reason) {}
}
