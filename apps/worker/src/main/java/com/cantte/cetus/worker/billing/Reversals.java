package com.cantte.cetus.worker.billing;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.notifications.Notifications;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.billing.OrderLots;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.BillingProfileEntity;
import com.cantte.cetus.persistence.entity.PaymentReversalEntity;
import com.cantte.cetus.persistence.entity.PaymentTransactionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionPeriodEntity;
import com.cantte.cetus.worker.notifications.Numbers;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * Applies money that went back from a paid order, once, with the order locked: the order's lots lose what they had
 * left, the order is REFUNDED once all of it went back, the subscription its open period was paid by ends, and after
 * a chargeback what the account had used of the order and no longer paid becomes a debt.
 */
@ApplicationScoped
public class Reversals {

    private static final Logger LOG = Logger.getLogger(Reversals.class);

    /** Fired inside the transaction that approves a reversal; the order's credit note is issued on it. */
    public record ReversalApproved(UUID reversalId, UUID orderId) {}

    @Inject
    CreditLedger ledger;

    @Inject
    AuditLog auditLog;

    @Inject
    Notifications notifications;

    @Inject
    Subscriptions subscriptions;

    @Inject
    Event<ReversalApproved> approved;

    @Inject
    JobQueue jobs;

    /**
     * Approves a reversal a person registered (a refund made elsewhere, a chargeback, or a Wompi refund left
     * unanswered that a person found approved in Wompi's dashboard) and applies it.
     *
     * @return whether it was applied now
     */
    @Transactional
    public boolean apply(UUID reversalId) {
        PaymentReversalEntity found = PaymentReversalEntity.<PaymentReversalEntity>findByIdOptional(reversalId)
                .orElseThrow(() -> new IllegalArgumentException("No reversal " + reversalId));
        BillingOrderEntity order = BillingOrderEntity.lock(found.orderId).orElseThrow();
        PaymentReversalEntity reversal = PaymentReversalEntity.lock(reversalId).orElseThrow();
        if (reversal.status != PaymentReversalEntity.Status.REQUESTED
                || reversal.mode != PaymentReversalEntity.Mode.EXTERNAL) {
            return false;
        }
        approve(order, reversal, OffsetDateTime.now());
        return true;
    }

    /**
     * The gateway voided an approved payment of a paid order that no refund of Cetus explains: the bank took it
     * back. Registered and applied as a chargeback of what had not gone back yet.
     *
     * @param order locked
     * @return the chargeback; empty when the order's money already went back, or a refund of it is on its way
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public Optional<PaymentReversalEntity> chargeBack(BillingOrderEntity order, String transactionId) {
        if (PaymentReversalEntity.findLive(order.id).isPresent()) {
            return Optional.empty();
        }
        long left = order.totalCents - PaymentReversalEntity.approvedCents(order.id);
        if (left <= 0) {
            return Optional.empty();
        }
        PaymentReversalEntity reversal = PaymentReversalEntity.request(
                order,
                PaymentReversalEntity.Kind.CHARGEBACK,
                PaymentReversalEntity.Mode.EXTERNAL,
                left,
                transactionId,
                Actor.system(),
                "Wompi anuló la transacción %s de la orden pagada".formatted(transactionId));
        approve(order, reversal, OffsetDateTime.now());
        return Optional.of(reversal);
    }

    /**
     * Gives back, through Wompi, a payment Wompi approved for an order that could not take it: the order was
     * canceled, or another payment already paid it. The order and its credits stay as they are.
     *
     * @param order locked
     * @return the return; empty when the transaction was given back already
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public Optional<PaymentReversalEntity> giveBack(
            BillingOrderEntity order, String transactionId, long amountCents, String reason) {
        if (PaymentReversalEntity.findReturn(transactionId).isPresent()) {
            return Optional.empty();
        }
        PaymentReversalEntity reversal = PaymentReversalEntity.request(
                order,
                PaymentReversalEntity.Kind.RETURN,
                PaymentReversalEntity.Mode.WOMPI,
                amountCents,
                transactionId,
                Actor.system(),
                reason);
        jobs.enqueue(JobTypes.REFUND_ORDER, reversal.id);
        LOG.warnf("Order %s could not take transaction %s; returning it (%s)", order.id, transactionId, reason);
        return Optional.of(reversal);
    }

    /**
     * Refunds, through Wompi, the whole of an order just paid for something the account can no longer get, such as
     * the renewal of a subscription that already ended.
     *
     * @param order locked, PAID by one approved transaction
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public PaymentReversalEntity refundUndelivered(BillingOrderEntity order, String reason) {
        if (order.status != BillingOrderEntity.Status.PAID) {
            throw new IllegalStateException("Order " + order.id + " is " + order.status + ", not PAID");
        }
        String transactionId = PaymentTransactionEntity.listByOrder(order.id).stream()
                .filter(payment -> payment.status == PaymentTransactionEntity.Status.APPROVED)
                .map(payment -> payment.providerTransactionId)
                .reduce((first, other) -> {
                    throw new IllegalStateException("Order " + order.id + " has more than one approved payment");
                })
                .orElseThrow(() -> new IllegalStateException("Paid order " + order.id + " has no approved payment"));
        PaymentReversalEntity reversal = PaymentReversalEntity.request(
                order,
                PaymentReversalEntity.Kind.REFUND,
                PaymentReversalEntity.Mode.WOMPI,
                order.totalCents,
                transactionId,
                Actor.system(),
                reason);
        jobs.enqueue(JobTypes.REFUND_ORDER, reversal.id);
        LOG.warnf("Order %s was paid for nothing; refunding it (%s)", order.id, reason);
        return reversal;
    }

    /**
     * Approves the reversal and applies it to its order; a return is only marked approved.
     *
     * @param order locked, with the reversal
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public void approve(BillingOrderEntity order, PaymentReversalEntity reversal, OffsetDateTime now) {
        if (reversal.status == PaymentReversalEntity.Status.APPROVED) {
            return;
        }
        reversal.status = PaymentReversalEntity.Status.APPROVED;
        reversal.approvedAt = now;
        Actor actor = new Actor(Actor.ActorType.valueOf(reversal.actorType), reversal.actorId);
        if (reversal.kind == PaymentReversalEntity.Kind.RETURN) {
            record(order, reversal, actor);
            LOG.infof("Return %s of order %s approved: %d cents back", reversal.id, order.id, reversal.amountCents);
            return;
        }
        String why = (reversal.kind == PaymentReversalEntity.Kind.REFUND ? "Reembolso " : "Contracargo ")
                + reversal.reference;

        ledger.lock(order.accountId);
        int revoked = 0;
        for (OrderLots.Item item : OrderLots.of(order.id)) {
            if (item.lot().isPresent()) {
                revoked += ledger.revoke(item.lot().get().id, actor, why);
            }
        }
        reversal.creditsRevoked = revoked;
        PaymentReversalEntity.flush();
        long reversed = PaymentReversalEntity.approvedCents(order.id);
        if (reversed > order.totalCents) {
            throw new IllegalStateException(
                    "Order " + order.id + " would give back " + reversed + " of " + order.totalCents + " cents");
        }
        boolean whole = reversed == order.totalCents;
        if (whole) {
            order.status = BillingOrderEntity.Status.REFUNDED;
        }
        if (reversal.kind == PaymentReversalEntity.Kind.CHARGEBACK) {
            long paid = order.totalCents - reversed;
            reversal.debtCents = Math.max(0, OrderLots.consumedCents(order.id) - paid);
            if (reversal.debtCents > 0) {
                reversal.debtOrderId = debt(order, reversal).id;
            }
        }
        if (whole) {
            String reason = reversal.kind == PaymentReversalEntity.Kind.REFUND ? "REFUNDED" : "CHARGEBACK";
            SubscriptionPeriodEntity.findByOpeningOrder(order.id)
                    .filter(period -> period.status == SubscriptionPeriodEntity.Status.OPEN)
                    .ifPresent(period -> subscriptions.end(period.subscriptionId, now, reason));
        }
        record(order, reversal, actor);
        LOG.infof(
                "Reversal %s of order %s approved: %d cents back, %d credits revoked",
                reversal.id, order.id, reversal.amountCents, revoked);
        approved.fire(new ReversalApproved(reversal.id, order.id));
    }

    private BillingOrderEntity debt(BillingOrderEntity order, PaymentReversalEntity reversal) {
        BillingProfileEntity profile = BillingProfileEntity.findById(order.accountId);
        BillingOrderEntity debt = BillingOrderEntity.open(
                order.accountId,
                BillingOrderEntity.Kind.DEBT,
                profile == null ? order.billingProfile : profile.party,
                null);
        BillingOrderItemEntity.add(
                debt,
                BillingOrderItemEntity.Type.ADJUSTMENT,
                null,
                null,
                "Documentos usados de la orden " + order.reference,
                1,
                reversal.debtCents,
                true,
                BigDecimal.ZERO);
        notifications.request(
                order.accountId,
                NotificationKind.ACCOUNT_DEBT,
                "account_debt:%s".formatted(debt.id),
                Map.of(
                        "total", Numbers.cop(debt.totalCents / 100),
                        "concept",
                                "los documentos usados de la orden %s, cuyo pago reversó el banco"
                                        .formatted(order.reference),
                        "orderId", debt.id.toString()));
        return debt;
    }

    private void record(BillingOrderEntity order, PaymentReversalEntity reversal, Actor actor) {
        Map<String, Object> data = new HashMap<>(Map.of(
                "reference",
                reversal.reference,
                "amountCents",
                reversal.amountCents,
                "status",
                order.status.name(),
                "kind",
                reversal.kind.name()));
        if (reversal.creditsRevoked != null) {
            data.put("creditsRevoked", reversal.creditsRevoked);
        }
        if (reversal.debtCents != null) {
            data.put("debtCents", reversal.debtCents);
        }
        auditLog.record(
                order.accountId,
                actor,
                null,
                reversal.kind == PaymentReversalEntity.Kind.CHARGEBACK
                        ? AuditAction.BILLING_ORDER_CHARGEBACK
                        : AuditAction.BILLING_ORDER_REFUNDED,
                "billing_order",
                order.id,
                data);
        switch (reversal.kind) {
            case REFUND ->
                notifications.request(
                        order.accountId,
                        NotificationKind.ORDER_REFUNDED,
                        "order_refunded:%s".formatted(reversal.id),
                        Map.of(
                                "amount", Numbers.cop(reversal.amountCents / 100),
                                "reference", order.reference,
                                "orderId", order.id.toString()));
            case RETURN ->
                notifications.request(
                        order.accountId,
                        NotificationKind.PAYMENT_RETURNED,
                        "payment_returned:%s".formatted(reversal.id),
                        Map.of(
                                "amount", Numbers.cop(reversal.amountCents / 100),
                                "reference", order.reference,
                                "orderStatus", order.status.name(),
                                "orderId", order.id.toString()));
            case CHARGEBACK -> {}
        }
    }
}
