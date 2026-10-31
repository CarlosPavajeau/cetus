package com.cantte.cetus.api.billing;

import com.cantte.cetus.domain.billing.Price;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.payments.Checkout;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.BillingProfileEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
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
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public final class BillingViews {

    private BillingViews() {}

    @Schema(description = "The terms of a plan for a while, in cents of COP")
    public record PlanVersionView(
            UUID id,
            int version,

            @Schema(nullable = true, description = "The account a private version is for; null for the public one")
            UUID accountId,

            @Schema(description = "As stored: final when taxIncluded")
            long priceCents,

            boolean taxIncluded,

            @Schema(description = "0.19 is 19 %") BigDecimal taxRate,

            long baseCents,
            long taxCents,
            long totalCents,

            @Schema(description = "Each month for a subscription; for the whole validity of a package or a top-up")
            int documentsIncluded,

            @Schema(nullable = true, description = "Production issuers it includes; null for a top-up")
            Integer issuersIncluded,

            @Schema(nullable = true, description = "Price of each document above the included ones; subscriptions only")
            Long priceOverageCents,

            OffsetDateTime validFrom,

            @Schema(nullable = true, description = "When the next version starts; null while it is the last one")
            OffsetDateTime validTo) {

        public static PlanVersionView from(PlanVersionEntity version) {
            Price price = new Price(version.priceCents, version.taxIncluded, version.taxRate);
            return new PlanVersionView(
                    version.id,
                    version.version,
                    version.accountId,
                    version.priceCents,
                    version.taxIncluded,
                    version.taxRate,
                    price.baseCents(),
                    price.taxCents(),
                    price.totalCents(),
                    version.documentsIncluded,
                    version.issuersIncluded,
                    version.priceOverageCents,
                    version.validFrom,
                    version.validTo);
        }
    }

    @Schema(description = "A plan of the catalog and the version that applies now")
    public record PlanOfferView(
            UUID id,
            String code,
            String name,
            PlanEntity.Kind kind,

            @Schema(nullable = true, description = "Months a package or a top-up lasts; null for a subscription")
            Integer validityMonths,

            @Schema(
                    nullable = true,
                    description = "The product an account must have to buy it: a top-up needs a package")
            PlanEntity.Kind requiresKind,

            @Schema(description = "Shown to everyone; an unlisted plan is sold through versions for one account")
            boolean listed,

            boolean active,

            @Schema(nullable = true, description = "The version that applies now; null when the plan has none")
            PlanVersionView version) {

        public static PlanOfferView from(PlanEntity plan, PlanVersionView version) {
            return new PlanOfferView(
                    plan.id,
                    plan.code,
                    plan.name,
                    plan.kind,
                    plan.validityMonths,
                    plan.requiresKind,
                    plan.listed,
                    plan.active,
                    version);
        }
    }

    @Schema(description = "A plan for the catalog; what it sells comes in its versions")
    public record CreatePlanRequest(
            @Schema(description = "Uppercase letters, digits and underscores", example = "PAQUETE_1200")
            @NotBlank
            @Pattern(regexp = "[A-Z][A-Z0-9_]{2,39}")
            String code,

            @NotBlank @Size(max = 100) String name,
            @NotNull PlanEntity.Kind kind,

            @Schema(nullable = true, description = "Required for a package or a top-up; none for a subscription")
            @Positive
            @Max(60)
            Integer validityMonths,

            @Schema(nullable = true, description = "Only for a top-up: the product an account must have to buy it")
            PlanEntity.Kind requiresKind,

            @Schema(description = "False for a plan sold only through private versions, like Socios") @NotNull
            Boolean listed) {}

    @Schema(description = "New terms for a plan; they close the open version of the same owner when they start")
    public record CreateVersionRequest(
            @Schema(description = "In cents of COP", example = "11900000") @NotNull @PositiveOrZero
            Long priceCents,

            @Schema(description = "Whether priceCents already includes the tax, as the catalog's prices do") @NotNull
            Boolean taxIncluded,

            @Schema(description = "0.19 is 19 %", example = "0.19")
            @NotNull
            @DecimalMin("0")
            @DecimalMax(value = "1", inclusive = false)
            @Digits(integer = 1, fraction = 4)
            BigDecimal taxRate,

            @NotNull @Positive Integer documentsIncluded,

            @Schema(nullable = true, description = "Required, except for a top-up, which includes none") @Positive
            Integer issuersIncluded,

            @Schema(nullable = true, description = "Required for a subscription; none for the other kinds")
            @PositiveOrZero
            Long priceOverageCents,

            @Schema(nullable = true, description = "The account of a private version; required for an unlisted plan")
            UUID accountId,

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

    @Schema(description = "What to buy: a version of the catalog the account is offered now")
    public record CreateOrderRequest(
            @Schema(description = "The id of the version in GET /console/plans") @NotNull
            UUID planVersionId) {}

    @Schema(description = "A line of an order, with the amounts it applied, in cents of COP")
    public record OrderItemView(
            BillingOrderItemEntity.Type itemType,

            @Schema(nullable = true, description = "The version bought; null for overage and adjustments")
            UUID planVersionId,

            String description,
            int quantity,

            @Schema(description = "Final") long unitPriceCents,

            long baseCents,
            BigDecimal taxRate,
            long taxCents,
            long totalCents) {

        static OrderItemView from(BillingOrderItemEntity item) {
            return new OrderItemView(
                    item.itemType,
                    item.planVersionId,
                    item.description,
                    item.quantity,
                    item.unitPriceCents,
                    item.baseCents,
                    item.taxRate,
                    item.taxCents,
                    item.totalCents);
        }
    }

    @Schema(description = "The signed parameters of Wompi's checkout, for its widget or its hosted page")
    public record CheckoutView(
            @Schema(description = "The hosted page with every parameter in its query")
            URI link,

            String publicKey,
            String reference,
            long amountInCents,
            String currency,

            @Schema(description = "As signed; send it unchanged")
            String expirationTime,

            @Schema(description = "Where Wompi sends the customer back; it never confirms the payment")
            URI redirectUrl,

            @Schema(description = "signature:integrity") String signature) {

        static CheckoutView from(Checkout checkout) {
            return new CheckoutView(
                    checkout.link(),
                    checkout.publicKey(),
                    checkout.reference(),
                    checkout.amountCents(),
                    checkout.currency(),
                    checkout.expirationTime(),
                    checkout.redirectUrl(),
                    checkout.signature());
        }
    }

    @Schema(description = "A purchase and its payment status, in cents of COP")
    public record OrderView(
            UUID id,
            BillingOrderEntity.Kind kind,
            BillingOrderEntity.Status status,

            @Schema(description = "What Wompi knows the order by")
            String reference,

            long subtotalCents,
            long taxCents,
            long totalCents,
            String currency,
            List<OrderItemView> items,

            @Schema(description = "After it an unpaid order expires")
            OffsetDateTime expiresAt,

            @Schema(nullable = true) OffsetDateTime paidAt,

            OffsetDateTime createdAt,

            @Schema(nullable = true, description = "Only while the order is pending and has not expired")
            CheckoutView checkout) {

        static OrderView from(BillingOrderEntity order, List<BillingOrderItemEntity> items, CheckoutView checkout) {
            return new OrderView(
                    order.id,
                    order.kind,
                    order.status,
                    order.reference,
                    order.subtotalCents,
                    order.taxCents,
                    order.totalCents,
                    order.currency,
                    items.stream().map(OrderItemView::from).toList(),
                    order.expiresAt,
                    order.paidAt,
                    order.createdAt,
                    checkout);
        }
    }

    @Schema(description = "The income of the paid orders in a calendar year (Colombia time), in cents of COP")
    public record RevenueView(
            int year,
            long revenueCents,

            @Schema(nullable = true, description = "The UVT's value configured; null without a threshold")
            Long uvtValueCop,

            @Schema(nullable = true, description = "The threshold in UVT configured; null without a threshold")
            Integer thresholdUvt,

            @Schema(nullable = true, description = "The threshold in cents; null without one")
            Long thresholdCents,

            @Schema(nullable = true, description = "Share of the threshold reached, in %; null without a threshold")
            BigDecimal thresholdPercent,

            @Schema(description = "The alert shares the income reached, lowest first")
            List<Integer> alertPercentsReached) {}
}
