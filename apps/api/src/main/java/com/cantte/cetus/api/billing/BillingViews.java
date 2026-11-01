package com.cantte.cetus.api.billing;

import com.cantte.cetus.domain.billing.Price;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.payments.CardSetup;
import com.cantte.cetus.payments.Checkout;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.BillingProfileEntity;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.CreditMovementEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.PaymentChargeEntity;
import com.cantte.cetus.persistence.entity.PaymentMethodEntity;
import com.cantte.cetus.persistence.entity.PaymentReversalEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

            @Schema(nullable = true, description = "After it an unpaid order expires; a debt never does")
            OffsetDateTime expiresAt,

            @Schema(nullable = true) OffsetDateTime paidAt,

            OffsetDateTime createdAt,

            @Schema(nullable = true, description = "Only while the order is pending and has not expired")
            CheckoutView checkout,

            @Schema(nullable = true, description = "Cetus' electronic invoice of the order, once it is issued")
            OrderInvoiceView invoice,

            @Schema(nullable = true, description = "The last attempt to charge the order to the saved card")
            OrderChargeView charge,

            @Schema(description = "Money that went back from the order, first first")
            List<OrderReversalView> reversals) {

        static OrderView from(
                BillingOrderEntity order,
                List<BillingOrderItemEntity> items,
                CheckoutView checkout,
                OrderInvoiceView invoice,
                OrderChargeView charge,
                List<OrderReversalView> reversals) {
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
                    checkout,
                    invoice,
                    charge,
                    reversals);
        }
    }

    @Schema(description = "Money that went back from a paid order: a refund, or a chargeback of the bank")
    public record OrderReversalView(
            PaymentReversalEntity.Kind kind,
            long amountCents,
            OffsetDateTime approvedAt,

            @Schema(nullable = true, description = "Cetus' credit note over the order's invoice")
            UUID creditNoteDocumentId,

            @Schema(nullable = true, description = "Its number and status, once it is issued")
            OrderInvoiceView creditNote) {

        static OrderReversalView from(PaymentReversalEntity reversal, OrderInvoiceView creditNote) {
            return new OrderReversalView(
                    reversal.kind,
                    reversal.amountCents,
                    reversal.approvedAt,
                    reversal.creditNoteDocumentId,
                    creditNote);
        }
    }

    @Schema(description = "An attempt to charge an order to the saved card")
    public record OrderChargeView(
            int attempt,
            PaymentChargeEntity.Origin origin,
            PaymentChargeEntity.Status status,

            @Schema(description = "When it runs, or ran") OffsetDateTime runAt,

            @Schema(nullable = true, description = "Wompi's reason when the card was declined")
            String failureMessage) {

        static OrderChargeView from(PaymentChargeEntity charge) {
            return new OrderChargeView(
                    charge.attempt, charge.origin, charge.status, charge.runAt, charge.failureMessage);
        }
    }

    @Schema(description = "The card the account saved to pay its renewals; only what can be shown of it")
    public record PaymentMethodView(
            UUID id,

            @Schema(description = "Such as VISA or MASTERCARD")
            String brand,

            String lastFour,
            int expMonth,
            int expYear,
            OffsetDateTime createdAt) {

        static PaymentMethodView from(PaymentMethodEntity method) {
            return new PaymentMethodView(
                    method.id, method.brand, method.lastFour, method.expMonth, method.expYear, method.createdAt);
        }
    }

    @Schema(
            description = "What the browser needs to tokenize a card with Wompi, so the card never reaches Cetus, and"
                    + " the terms the customer accepts first")
    public record CardSetupView(
            String publicKey,

            @Schema(description = "Where the browser posts the card, with the public key as its Bearer token")
            URI tokenizationUrl,

            AcceptanceView endUserPolicy,
            AcceptanceView personalDataAuth) {

        static CardSetupView from(CardSetup setup) {
            return new CardSetupView(
                    setup.publicKey(),
                    setup.tokenizationUrl(),
                    new AcceptanceView(
                            setup.endUserPolicy().token(), setup.endUserPolicy().permalink()),
                    new AcceptanceView(
                            setup.personalDataAuth().token(),
                            setup.personalDataAuth().permalink()));
        }
    }

    @Schema(description = "A Wompi document the customer accepts: the link to read it and the token of the acceptance")
    public record AcceptanceView(String token, URI permalink) {}

    public record SavePaymentMethodRequest(
            @Schema(description = "The token Wompi gave the browser for the card (tok_…)") @NotBlank @Size(max = 200)
            String cardToken,

            @Schema(description = "The token of Wompi's terms the customer accepted") @NotBlank @Size(max = 4000)
            String acceptanceToken,

            @Schema(description = "The token of Wompi's personal data authorization the customer accepted")
            @NotBlank
            @Size(max = 4000)
            String personalDataAuthToken,

            @Schema(description = "As Wompi answered the tokenization, such as VISA")
            @NotBlank
            @Pattern(regexp = "[A-Z][A-Z_ ]{1,29}")
            String brand,

            @NotNull @Min(1) @Max(12) Integer expMonth,

            @Schema(description = "With its four digits") @NotNull @Min(2000) @Max(2199)
            Integer expYear) {}

    @Schema(description = "The electronic invoice Cetus issued for an order; its files download once it is accepted")
    public record OrderInvoiceView(
            @Schema(description = "Prefix and number, such as CET1001")
            String number,

            DocumentStatus status) {

        static OrderInvoiceView from(DocumentEntity.NumberStatus doc) {
            return new OrderInvoiceView(doc.fullNumber(), doc.status());
        }
    }

    @Schema(description = "A lot of credits and what is left of it")
    public record CreditLotView(
            UUID id,

            @Schema(nullable = true, description = "The product the lot comes from; null for an adjustment")
            String planName,

            @Schema(nullable = true, description = "null for an adjustment")
            PlanEntity.Kind planKind,

            CreditGrantEntity.SourceType sourceType,
            int quantity,
            int remaining,
            OffsetDateTime expiresAt,
            CreditGrantEntity.Status status,
            OffsetDateTime createdAt) {}

    @Schema(description = "A change to the account's credits")
    public record CreditMovementView(
            UUID id,
            CreditMovementEntity.Type type,

            @Schema(description = "Positive when credits are added, negative when they are taken")
            int quantity,

            @Schema(nullable = true, description = "The document that reserved, used or gave back the credit")
            UUID documentId,

            @Schema(enumeration = {"USER", "API_KEY", "PLATFORM", "SYSTEM"})
            String actorType,

            @Schema(nullable = true) String reason,

            OffsetDateTime createdAt) {

        public static CreditMovementView from(CreditMovementEntity movement) {
            return new CreditMovementView(
                    movement.id,
                    movement.type,
                    movement.quantity,
                    movement.documentId,
                    movement.actorType,
                    movement.reason,
                    movement.createdAt);
        }
    }

    @Schema(description = "The account's credits: what is left, its lots and the latest movements")
    public record AccountCreditsView(
            @Schema(description = "Whether a subscription or a package in force lets the account issue in production")
            boolean product,

            @Schema(description = "Whether a package is in force")
            boolean productPackage,

            @Schema(
                    nullable = true,
                    description = "The plan of the subscription that is not canceled; null without one")
            String subscription,

            @Schema(description = "Credits left in the lots that have not expired")
            int available,

            @Schema(description = "Credits the lots in force were granted with")
            int granted,

            @Schema(description = "Documents issued without credits, not yet paid by a lot; credit notes aside")
            int graceUsed,

            @Schema(description = "Documents the package allows without credits; 0 without one or with a subscription")
            int graceMargin,

            @Schema(description = "Production issuers the subscription and the packages in force include")
            int issuersIncluded,

            @Schema(description = "Production issuers the account has")
            long issuersLive,

            @Schema(
                    nullable = true,
                    description = "The pending debt that blocks new purchases until it is paid; null without one")
            UUID debtOrderId,

            @Schema(description = "Every lot, newest first") List<CreditLotView> lots,

            @Schema(description = "The latest, newest first")
            List<CreditMovementView> movements) {}

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

    @Schema(description = "The open month of a subscription")
    public record SubscriptionPeriodView(
            int number,
            OffsetDateTime startsAt,

            @Schema(description = "When the period closes and the next one is renewed")
            OffsetDateTime endsAt,

            int documentsIncluded,

            @Schema(
                    nullable = true,
                    description = "Left in the period's lot; null until the order that opens it is paid")
            Integer documentsAvailable,

            @Schema(description = "Documents past the credits, billed at the close; credit notes included")
            int overage,

            @Schema(description = "The overage that counts against the limit: credit notes aside")
            int overageLimited,

            long priceOverageCents,

            @Schema(description = "What the overage so far costs at the close")
            long overageCostCents,

            @Schema(nullable = true, description = "The order that opened the period while it is unpaid")
            UUID renewalOrderId) {}

    @Schema(description = "The account's subscription that is not canceled")
    public record SubscriptionView(
            UUID id,
            SubscriptionEntity.Status status,
            String planCode,
            String planName,

            @Schema(description = "The terms the open period was sold at")
            PlanVersionView version,

            @Schema(nullable = true, description = "The plan the next period takes, when a change is scheduled")
            String planNextName,

            @Schema(nullable = true) UUID planVersionNextId,

            @Schema(description = "Whether it ends with the open period instead of renewing")
            boolean cancelAtPeriodEnd,

            @Schema(description = "How much overage a period may run up before new documents are refused")
            long overageLimitCents,

            @Schema(description = "overageLimitCents in documents at the period's overage price")
            int overageLimit,

            OffsetDateTime startedAt,

            @Schema(nullable = true, description = "Since when the renewal is unpaid")
            OffsetDateTime pastDueAt,

            @Schema(nullable = true, description = "When an unpaid renewal cancels the subscription")
            OffsetDateTime payBy,

            SubscriptionPeriodView period) {}

    public record OverageLimitRequest(
            @Schema(description = "In COP cents; 0 refuses every overage document but credit notes")
            @NotNull
            @Min(0)
            @Max(100_000_000_000L)
            Long overageLimitCents) {}

    public record PlanNextRequest(
            @Schema(
                    nullable = true,
                    description = "A subscription version offered to the account; null undoes the change")
            UUID planVersionId) {}
}
