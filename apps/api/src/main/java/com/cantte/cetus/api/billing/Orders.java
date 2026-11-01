package com.cantte.cetus.api.billing;

import com.cantte.cetus.api.billing.BillingViews.CheckoutView;
import com.cantte.cetus.api.billing.BillingViews.CreateOrderRequest;
import com.cantte.cetus.api.billing.BillingViews.OrderChargeView;
import com.cantte.cetus.api.billing.BillingViews.OrderInvoiceView;
import com.cantte.cetus.api.billing.BillingViews.OrderReversalView;
import com.cantte.cetus.api.billing.BillingViews.OrderView;
import com.cantte.cetus.api.documents.DocumentFiles;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.credits.Entitlements;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.payments.CheckoutRequest;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.audit.RequestOrigin;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.BillingProfileEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.PaymentChargeEntity;
import com.cantte.cetus.persistence.entity.PaymentMethodEntity;
import com.cantte.cetus.persistence.entity.PaymentReversalEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import java.net.URI;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Purchases from the console. The browser only says which version it buys; the server builds the order from it,
 * so the amount charged is always the catalog's. An order is paid through the gateway's checkout and only the
 * gateway confirms it (the worker); here it is placed and read.
 */
@ApplicationScoped
public class Orders {

    @Inject
    PlanCatalog catalog;

    @Inject
    PaymentClients payments;

    @Inject
    AuditLog auditLog;

    @Inject
    Entitlements entitlements;

    @Inject
    DocumentFiles files;

    @Inject
    JobQueue jobs;

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
        if (version.priceCents == 0) {
            throw new DomainException("plan_not_purchasable", "This plan cannot be bought from the console");
        }
        if (BillingOrderEntity.hasDebt(accountId)) {
            throw new DomainException(
                    "account_has_debt", "The account owes what it used and did not pay; pay that order first");
        }
        if (SubscriptionEntity.findCurrent(accountId).isPresent()) {
            throw new DomainException(
                    "subscription_active",
                    plan.kind == PlanEntity.Kind.SUBSCRIPTION
                            ? "The account already has a subscription; change its plan instead"
                            : "A subscription bills its overage; packages and top-ups are not sold alongside it");
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (plan.requiresKind != null && !entitlements.of(accountId, now).productPackage()) {
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
        BillingOrderEntity order =
                BillingOrderEntity.open(accountId, BillingOrderEntity.Kind.PURCHASE, profile, now.plus(orderTtl));
        BillingOrderItemEntity item = BillingOrderItemEntity.add(
                order,
                BillingOrderItemEntity.Type.PLAN,
                version.id,
                null,
                plan.name,
                1,
                version.priceCents,
                version.taxIncluded,
                version.taxRate);

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
        return view(order, List.of(item), null, null, List.of());
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public OrderView get(UUID accountId, UUID orderId) {
        BillingOrderEntity order = BillingOrderEntity.findForAccount(orderId, accountId)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        return views(List.of(order)).getFirst();
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public List<OrderView> list(UUID accountId, int limit) {
        return views(BillingOrderEntity.listByAccount(accountId, limit));
    }

    /**
     * A short-lived URL to one of the files of the order's invoice. The invoice belongs to Cetus' own account, so it
     * is reached only through an order of the caller's account.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public DocumentFiles.DocumentFileResponse invoiceFile(UUID accountId, UUID orderId, String file) {
        BillingOrderEntity order = BillingOrderEntity.findForAccount(orderId, accountId)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        if (order.invoiceDocumentId == null) {
            throw new DocumentFiles.FileNotAvailable(file);
        }
        DocumentEntity invoice = DocumentEntity.findById(order.invoiceDocumentId);
        return files.presign(invoice.accountId, invoice.environment, invoice.id, invoice.documentType, file);
    }

    /**
     * A short-lived URL to one of the files of a credit note of money that went back from the order; like the
     * invoice, it belongs to Cetus' own account and is reached only through the order.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public DocumentFiles.DocumentFileResponse creditNoteFile(
            UUID accountId, UUID orderId, UUID documentId, String file) {
        BillingOrderEntity order = BillingOrderEntity.findForAccount(orderId, accountId)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        boolean credited = PaymentReversalEntity.listByOrder(order.id).stream()
                .anyMatch(reversal -> documentId.equals(reversal.creditNoteDocumentId));
        if (!credited) {
            throw new NotFoundException("Credit note not found");
        }
        DocumentEntity note = DocumentEntity.findById(documentId);
        return files.presign(note.accountId, note.environment, note.id, note.documentType, file);
    }

    /** The orders with their items and invoices, read in one query each. */
    private List<OrderView> views(List<BillingOrderEntity> orders) {
        Map<UUID, List<BillingOrderItemEntity>> items =
                BillingOrderItemEntity.listByOrders(
                                orders.stream().map(order -> order.id).toList())
                        .stream()
                        .collect(Collectors.groupingBy(item -> item.orderId));
        Map<UUID, OrderChargeView> charges =
                PaymentChargeEntity.listByOrders(
                                orders.stream().map(order -> order.id).toList())
                        .stream()
                        .collect(Collectors.toMap(
                                charge -> charge.orderId, OrderChargeView::from, (first, later) -> later));
        Map<UUID, List<PaymentReversalEntity>> reversals =
                PaymentReversalEntity.listByOrders(
                                orders.stream().map(order -> order.id).toList())
                        .stream()
                        .filter(reversal -> reversal.status == PaymentReversalEntity.Status.APPROVED)
                        .collect(Collectors.groupingBy(reversal -> reversal.orderId));
        Map<UUID, OrderInvoiceView> invoices = DocumentEntity.listNumberStatus(Stream.concat(
                                orders.stream().map(order -> order.invoiceDocumentId),
                                reversals.values().stream()
                                        .flatMap(List::stream)
                                        .map(reversal -> reversal.creditNoteDocumentId))
                        .filter(Objects::nonNull)
                        .toList())
                .stream()
                .collect(Collectors.toMap(DocumentEntity.NumberStatus::id, OrderInvoiceView::from));
        return orders.stream()
                .map(order -> view(
                        order,
                        items.getOrDefault(order.id, List.of()),
                        order.invoiceDocumentId == null ? null : invoices.get(order.invoiceDocumentId),
                        charges.get(order.id),
                        reversals.getOrDefault(order.id, List.of()).stream()
                                .map(reversal -> OrderReversalView.from(
                                        reversal,
                                        reversal.creditNoteDocumentId == null
                                                ? null
                                                : invoices.get(reversal.creditNoteDocumentId)))
                                .toList()))
                .toList();
    }

    /** The checkout only while the order can still be paid; signing again gives the same parameters. */
    private OrderView view(
            BillingOrderEntity order,
            List<BillingOrderItemEntity> items,
            OrderInvoiceView invoice,
            OrderChargeView charge,
            List<OrderReversalView> reversals) {
        OffsetDateTime now = OffsetDateTime.now();
        // A debt never expires: its checkout lasts as long as a new order's.
        OffsetDateTime checkoutExpiresAt = order.expiresAt == null ? now.plus(orderTtl) : order.expiresAt;
        Optional<CheckoutView> checkout = payments.gateway()
                .filter(g -> order.isPayable(now))
                .map(g -> CheckoutView.from(g.checkout(new CheckoutRequest(
                        order.reference,
                        order.totalCents,
                        order.currency,
                        checkoutExpiresAt.toInstant(),
                        consoleUrl.resolve("/billing/orders/" + order.id)))));
        return OrderView.from(order, items, checkout.orElse(null), invoice, charge, reversals);
    }

    /**
     * Charges a pending order to the account's saved card now, as its owner asks from the console; the worker makes
     * the charge. An attempt of the renewal still waiting for its day gives way to this one; one already sent must
     * be answered first.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public OrderView charge(UUID accountId, UUID orderId, Actor actor, RequestOrigin origin) {
        if (payments.gateway().isEmpty()) {
            throw new PaymentsUnavailable();
        }
        BillingOrderEntity.findForAccount(orderId, accountId)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        BillingOrderEntity order = BillingOrderEntity.lock(orderId).orElseThrow();
        OffsetDateTime now = OffsetDateTime.now();
        if (!order.isPayable(now)) {
            throw new DomainException("order_not_payable", "The order is no longer waiting to be paid");
        }
        PaymentMethodEntity card = PaymentMethodEntity.findActive(accountId)
                .orElseThrow(() ->
                        new DomainException("payment_method_required", "Save a card before charging an order to it"));
        Optional<PaymentChargeEntity> live = PaymentChargeEntity.findLive(order.id);
        if (live.isPresent()) {
            PaymentChargeEntity waiting =
                    PaymentChargeEntity.lock(live.get().id).orElseThrow();
            if (waiting.status == PaymentChargeEntity.Status.SUBMITTED) {
                throw new ChargeInProgress();
            }
            waiting.status = PaymentChargeEntity.Status.CANCELED;
            // Before the new attempt is inserted: an order has one live attempt at most.
            PaymentChargeEntity.flush();
        }
        PaymentChargeEntity charge = PaymentChargeEntity.schedule(order, card, PaymentChargeEntity.Origin.MANUAL, now);
        jobs.enqueue(JobTypes.CHARGE_ORDER, charge.id);
        auditLog.record(
                accountId,
                actor,
                origin,
                AuditAction.BILLING_ORDER_CHARGE_REQUESTED,
                "billing_order",
                order.id,
                Map.of("reference", charge.reference, "card", card.label(), "totalCents", order.totalCents));
        return views(List.of(order)).getFirst();
    }

    /** An attempt to charge the order was sent to Wompi and has no answer yet. */
    public static class ChargeInProgress extends WebApplicationException {

        ChargeInProgress() {
            super(ProblemDetail.response(
                    409, "charge_in_progress", "A charge of this order is waiting for Wompi's answer"));
        }
    }

    /** Without the Wompi keys nothing can be charged. */
    public static class PaymentsUnavailable extends WebApplicationException {

        PaymentsUnavailable() {
            super(ProblemDetail.response(503, "payments_not_configured", "Payments are not available right now"));
        }
    }
}
