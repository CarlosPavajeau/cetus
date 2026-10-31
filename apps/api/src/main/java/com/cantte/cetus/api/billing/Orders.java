package com.cantte.cetus.api.billing;

import com.cantte.cetus.api.billing.BillingViews.CheckoutView;
import com.cantte.cetus.api.billing.BillingViews.CreateOrderRequest;
import com.cantte.cetus.api.billing.BillingViews.OrderView;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.credits.Entitlements;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.billing.Price;
import com.cantte.cetus.payments.CheckoutRequest;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.audit.RequestOrigin;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.BillingProfileEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import java.net.URI;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Purchases from the console. The browser only says which version it buys; the server builds the order from it,
 * so the amount charged is always the catalog's. An order is paid through the gateway's checkout and only the
 * gateway confirms it (the worker); here it is placed and read.
 */
@ApplicationScoped
public class Orders {

    public static final String CURRENCY = "COP";

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final char[] BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ".toCharArray();

    @Inject
    PlanCatalog catalog;

    @Inject
    PaymentClients payments;

    @Inject
    AuditLog auditLog;

    @Inject
    Entitlements entitlements;

    @ConfigProperty(name = "cetus.billing.order-ttl")
    Duration orderTtl;

    @ConfigProperty(name = "cetus.console.url")
    URI consoleUrl;

    @Transactional(Transactional.TxType.MANDATORY)
    public OrderView create(UUID accountId, CreateOrderRequest request, Actor actor, RequestOrigin origin) {
        if (payments.gateway().isEmpty()) {
            throw new PaymentsUnavailable();
        }
        boolean offered = catalog.offers(accountId).stream()
                .anyMatch(
                        offer -> offer.version() != null && offer.version().id().equals(request.planVersionId()));
        if (!offered) {
            throw new DomainException(
                    "plan_version_not_offered", "That version is not for sale to this account now; reload the catalog");
        }
        PlanVersionEntity version = PlanVersionEntity.findById(request.planVersionId());
        PlanEntity plan = PlanEntity.findById(version.planId);
        if (plan.kind == PlanEntity.Kind.SUBSCRIPTION || version.priceCents == 0) {
            throw new DomainException("plan_not_purchasable", "This plan cannot be bought from the console yet");
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (plan.requiresKind != null && !entitlements.of(accountId, now).product()) {
            throw new DomainException(
                    "plan_requires_product",
                    "Buying " + plan.name + " needs a "
                            + plan.requiresKind.name().toLowerCase() + " in force");
        }
        BillingProfileEntity profile = BillingProfileEntity.findById(accountId);
        if (profile == null) {
            throw new DomainException(
                    "billing_profile_required", "Set who Cetus invoices for the account before buying");
        }
        Price price = new Price(version.priceCents, version.taxIncluded, version.taxRate);

        BillingOrderEntity order = new BillingOrderEntity();
        order.id = Ids.newId();
        order.accountId = accountId;
        order.kind = BillingOrderEntity.Kind.PURCHASE;
        order.status = BillingOrderEntity.Status.PENDING;
        order.reference = reference();
        order.subtotalCents = price.baseCents();
        order.taxCents = price.taxCents();
        order.totalCents = price.totalCents();
        order.currency = CURRENCY;
        order.billingProfile = profile.party;
        order.expiresAt = now.plus(orderTtl);
        order.persist();

        BillingOrderItemEntity item = new BillingOrderItemEntity();
        item.id = Ids.newId();
        item.orderId = order.id;
        item.itemType = BillingOrderItemEntity.Type.PLAN;
        item.planVersionId = version.id;
        item.description = plan.name;
        item.quantity = 1;
        item.unitPriceCents = price.totalCents();
        item.baseCents = price.baseCents();
        item.taxRate = version.taxRate;
        item.taxCents = price.taxCents();
        item.totalCents = price.totalCents();
        item.persist();

        auditLog.record(
                accountId,
                actor,
                origin,
                AuditAction.BILLING_ORDER_CREATED,
                "billing_order",
                order.id,
                Map.of(
                        "reference", order.reference,
                        "plan", plan.code,
                        "version", version.version,
                        "totalCents", order.totalCents));
        return view(order, List.of(item));
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public OrderView get(UUID accountId, UUID orderId) {
        BillingOrderEntity order = BillingOrderEntity.findForAccount(orderId, accountId)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        return view(order, BillingOrderItemEntity.listByOrder(order.id));
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public List<OrderView> list(UUID accountId, int limit) {
        return BillingOrderEntity.listByAccount(accountId, limit).stream()
                .map(order -> view(order, BillingOrderItemEntity.listByOrder(order.id)))
                .toList();
    }

    /** The checkout only while the order can still be paid; signing again gives the same parameters. */
    private OrderView view(BillingOrderEntity order, List<BillingOrderItemEntity> items) {
        boolean payable =
                order.status == BillingOrderEntity.Status.PENDING && order.expiresAt.isAfter(OffsetDateTime.now());
        Optional<CheckoutView> checkout = payments.gateway()
                .filter(g -> payable)
                .map(g -> CheckoutView.from(g.checkout(new CheckoutRequest(
                        order.reference,
                        order.totalCents,
                        order.currency,
                        order.expiresAt.toInstant(),
                        consoleUrl.resolve("/billing/orders/" + order.id)))));
        return OrderView.from(order, items, checkout.orElse(null));
    }

    /** "CET-" and 26 characters of Crockford's base32: 128 random bits. */
    static String reference() {
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        StringBuilder reference = new StringBuilder("CET-");
        int buffer = 0;
        int bits = 0;
        for (byte b : bytes) {
            buffer = (buffer << 8) | (b & 0xff);
            bits += 8;
            while (bits >= 5) {
                reference.append(BASE32[(buffer >>> (bits - 5)) & 31]);
                bits -= 5;
            }
        }
        reference.append(BASE32[(buffer << (5 - bits)) & 31]);
        return reference.toString();
    }

    /** Without the Wompi keys nothing can be charged. */
    public static class PaymentsUnavailable extends WebApplicationException {

        PaymentsUnavailable() {
            super(ProblemDetail.response(503, "payments_not_configured", "Payments are not available right now"));
        }
    }
}
