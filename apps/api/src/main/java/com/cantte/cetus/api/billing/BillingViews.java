package com.cantte.cetus.api.billing;

import com.cantte.cetus.domain.billing.Price;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.persistence.entity.BillingProfileEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanPriceEntity;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public final class BillingViews {

    private BillingViews() {}

    @Schema(description = "A version of a plan's price, in cents of COP")
    public record PlanPriceView(
            int version,

            @Schema(description = "Before tax") long amountCents,

            String currency,

            @Schema(description = "0.19 is 19 %") BigDecimal taxRate,

            long taxCents,
            long totalCents,
            OffsetDateTime validFrom,

            @Schema(nullable = true, description = "When the next version starts; null while it is the last one")
            OffsetDateTime validTo) {

        public static PlanPriceView from(PlanPriceEntity price) {
            Price amounts = new Price(price.amountCents, price.taxRate);
            return new PlanPriceView(
                    price.version,
                    price.amountCents,
                    price.currency,
                    price.taxRate,
                    amounts.taxCents(),
                    amounts.totalCents(),
                    price.validFrom,
                    price.validTo);
        }
    }

    @Schema(description = "A plan of the catalog and the price it has now")
    public record PlanOfferView(
            String code,
            String name,
            PlanEntity.Kind kind,

            @Schema(
                    nullable = true,
                    description = "Documents each month for a subscription, or for the whole validity of a package"
                            + " or a top-up; null is no limit")
            Integer documentsIncluded,

            @Schema(nullable = true, description = "Months a package or a top-up lasts; null for a subscription")
            Integer validityMonths,

            boolean active,

            @Schema(nullable = true, description = "The price that applies now; null when the plan has none")
            PlanPriceView price) {

        public static PlanOfferView from(PlanEntity plan, PlanPriceView price) {
            return new PlanOfferView(
                    plan.code, plan.name, plan.kind, plan.documentsIncluded, plan.validityMonths, plan.active, price);
        }
    }

    @Schema(description = "A package or a top-up for sale; subscriptions come with their limits in a migration")
    public record CreatePlanRequest(
            @Schema(description = "Uppercase letters, digits and underscores", example = "PAQUETE_1200")
            @NotBlank
            @Pattern(regexp = "[A-Z][A-Z0-9_]{2,39}")
            String code,

            @NotBlank @Size(max = 100) String name,

            @Schema(enumeration = {"PACKAGE", "TOPUP"}) @NotNull
            PlanEntity.Kind kind,

            @NotNull @Positive Integer documentsIncluded,
            @NotNull @Positive @Max(60) Integer validityMonths) {}

    public record CreatePriceRequest(
            @Schema(description = "Before tax, in cents of COP", example = "39000000") @NotNull @PositiveOrZero
            Long amountCents,

            @Schema(description = "0.19 is 19 %", example = "0.19")
            @NotNull
            @DecimalMin("0")
            @DecimalMax(value = "1", inclusive = false)
            @Digits(integer = 1, fraction = 4)
            BigDecimal taxRate,

            @Schema(nullable = true, description = "When it starts; now when left out. Never in the past")
            OffsetDateTime validFrom) {}

    @Schema(description = "Who Cetus invoices for the account's purchases")
    public record BillingProfileView(
            PersonType personType,
            IdentificationType identificationType,
            String identificationNumber,

            @Schema(nullable = true) String checkDigit,

            String legalName,

            @Schema(nullable = true) String tradeName,

            List<String> taxLevelCodes,

            @Schema(enumeration = {"IVA", "NOT_APPLICABLE"}) String taxScheme,

            @Schema(nullable = true) Address address,

            @Schema(description = "Where the invoices of the purchases go")
            String email,

            @Schema(nullable = true) String phone,

            OffsetDateTime updatedAt) {

        public static BillingProfileView from(BillingProfileEntity profile) {
            Party party = profile.party;
            return new BillingProfileView(
                    party.personType(),
                    party.identificationType(),
                    party.identificationNumber(),
                    party.checkDigit(),
                    party.legalName(),
                    party.tradeName(),
                    party.taxLevelCodes(),
                    "01".equals(party.taxSchemeId()) ? "IVA" : "NOT_APPLICABLE",
                    party.address(),
                    party.email(),
                    party.phone(),
                    profile.updatedAt);
        }
    }
}
