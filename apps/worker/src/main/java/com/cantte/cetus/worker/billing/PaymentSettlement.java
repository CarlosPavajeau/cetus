package com.cantte.cetus.worker.billing;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.payments.PaymentStatus;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.PaymentChargeEntity;
import com.cantte.cetus.persistence.entity.PaymentTransactionEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * Applies a transaction as Wompi reports it to the order of its reference, in one transaction with the order
 * locked: the webhook and the reconciliation may bring the same payment at once, and it pays the order once.
 * A final status never goes back, an approved payment of another amount or a second approved payment waits for a
 * person, an approval after the order expired still pays it, and a void of a paid order's payment is a chargeback.
 */
@ApplicationScoped
public class PaymentSettlement {

    private static final Logger LOG = Logger.getLogger(PaymentSettlement.class);

    public enum Outcome {
        PAID,
        ALREADY_PAID,
        /** Recorded, with the order's review_reason saying why a person must look at it. */
        REVIEW,
        /** A payment attempt that does not pay the order (pending, declined, failed). */
        RECORDED,
        /** The payment of a paid order was voided with no refund to explain it: applied as a chargeback. */
        CHARGED_BACK,
        /** No order has the reference: another merchant integration or a test payment. */
        UNKNOWN_ORDER
    }

    /** Fired inside the transaction that pays the order; phase 3 grants the order's credits on it. */
    public record OrderPaid(UUID orderId, UUID accountId) {}

    /**
     * Fired with the order locked for each transaction of a charge to a saved card, with the status kept for it,
     * which a late event does not move back.
     */
    public record ChargeSettled(UUID chargeId, String transactionId, PaymentStatus status, Optional<String> message) {}

    @Inject
    AuditLog auditLog;

    @Inject
    Reversals reversals;

    @Inject
    Event<OrderPaid> orderPaid;

    @Inject
    Event<ChargeSettled> chargeSettled;

    /** The reference is the order's (its checkout) or one of its charges to a saved card. */
    @Transactional
    public Outcome apply(PaymentTransaction transaction) {
        Optional<PaymentChargeEntity> charge = PaymentChargeEntity.findByReference(transaction.reference());
        Optional<BillingOrderEntity> found = charge.isPresent()
                ? BillingOrderEntity.lock(charge.get().orderId)
                : BillingOrderEntity.lockByReference(transaction.reference());
        if (found.isEmpty()) {
            return Outcome.UNKNOWN_ORDER;
        }
        BillingOrderEntity order = found.get();
        PaymentTransactionEntity stored = record(order, transaction);
        Outcome outcome = settle(order, stored);
        charge.ifPresent(attempt -> chargeSettled.fire(new ChargeSettled(
                attempt.id,
                stored.providerTransactionId,
                PaymentStatus.valueOf(stored.status.name()),
                Optional.ofNullable(stored.statusMessage))));
        return outcome;
    }

    private Outcome settle(BillingOrderEntity order, PaymentTransactionEntity stored) {
        return switch (stored.status) {
            case APPROVED -> approve(order, stored);
            case VOIDED -> {
                if (order.status != BillingOrderEntity.Status.PAID) {
                    yield Outcome.RECORDED;
                }
                boolean paidByAnother = PaymentTransactionEntity.listByOrder(order.id).stream()
                        .anyMatch(other -> other.status == PaymentTransactionEntity.Status.APPROVED
                                && !other.id.equals(stored.id));
                if (paidByAnother) {
                    review(
                            order,
                            "Wompi anuló la transacción %s y otra aprobada sigue pagando la orden"
                                    .formatted(stored.providerTransactionId));
                    yield Outcome.REVIEW;
                }
                yield reversals.chargeBack(order, stored.providerTransactionId).isPresent()
                        ? Outcome.CHARGED_BACK
                        : Outcome.RECORDED;
            }
            case PENDING, DECLINED, ERROR -> Outcome.RECORDED;
        };
    }

    private Outcome approve(BillingOrderEntity order, PaymentTransactionEntity payment) {
        // Wompi keeps a refunded payment APPROVED: a refunded order was paid by it all the same.
        if (order.status == BillingOrderEntity.Status.PAID || order.status == BillingOrderEntity.Status.REFUNDED) {
            boolean paidByAnother = PaymentTransactionEntity.listByOrder(order.id).stream()
                    .anyMatch(other ->
                            other.status == PaymentTransactionEntity.Status.APPROVED && !other.id.equals(payment.id));
            if (!paidByAnother) {
                return Outcome.ALREADY_PAID;
            }
            review(
                    order,
                    "Wompi aprobó la transacción %s de una orden que otra ya pagó: el cliente pagó dos veces"
                            .formatted(payment.providerTransactionId));
            return Outcome.REVIEW;
        }
        if (payment.amountCents != order.totalCents || !payment.currency.equals(order.currency)) {
            review(
                    order,
                    "La transacción %s de Wompi pagó %d %s y la orden vale %d %s"
                            .formatted(
                                    payment.providerTransactionId,
                                    payment.amountCents,
                                    payment.currency,
                                    order.totalCents,
                                    order.currency));
            return Outcome.REVIEW;
        }
        if (order.status != BillingOrderEntity.Status.PENDING && order.status != BillingOrderEntity.Status.EXPIRED) {
            review(
                    order,
                    "Wompi aprobó la transacción %s de una orden %s"
                            .formatted(payment.providerTransactionId, order.status));
            return Outcome.REVIEW;
        }
        order.status = BillingOrderEntity.Status.PAID;
        order.paidAt = payment.finalizedAt == null ? OffsetDateTime.now() : payment.finalizedAt;
        auditLog.record(
                order.accountId,
                Actor.system(),
                null,
                AuditAction.BILLING_ORDER_PAID,
                "billing_order",
                order.id,
                Map.of(
                        "reference", order.reference,
                        "transactionId", payment.providerTransactionId,
                        "paymentMethodType", payment.paymentMethodType,
                        "totalCents", order.totalCents));
        orderPaid.fire(new OrderPaid(order.id, order.accountId));
        return Outcome.PAID;
    }

    /** The first reason stays: a later one is logged, and the person reviewing sees every transaction. */
    static void review(BillingOrderEntity order, String reason) {
        LOG.warnf("Order %s needs review: %s", order.id, reason);
        if (order.reviewReason == null) {
            order.reviewReason = reason;
        }
    }

    /**
     * Stores the transaction, or what changed of it. A PENDING never replaces a final status, and a final one
     * only changes from APPROVED to VOIDED: events arrive out of order.
     */
    private static PaymentTransactionEntity record(BillingOrderEntity order, PaymentTransaction transaction) {
        PaymentTransactionEntity stored = PaymentTransactionEntity.findByProviderId(
                        PaymentTransactionEntity.Provider.WOMPI, transaction.id())
                .orElseGet(() -> {
                    PaymentTransactionEntity created = new PaymentTransactionEntity();
                    created.id = Ids.newId();
                    created.orderId = order.id;
                    created.provider = PaymentTransactionEntity.Provider.WOMPI;
                    created.providerTransactionId = transaction.id();
                    return created;
                });
        PaymentTransactionEntity.Status status =
                PaymentTransactionEntity.Status.valueOf(transaction.status().name());
        boolean known = stored.status != null;
        boolean storedFinal = known && stored.status != PaymentTransactionEntity.Status.PENDING;
        boolean voidsApproval = stored.status == PaymentTransactionEntity.Status.APPROVED
                && transaction.status() == PaymentStatus.VOIDED;
        if (known && stored.status != status && storedFinal && !voidsApproval) {
            LOG.infof(
                    "Wompi transaction %s stays %s; %s arrived late",
                    transaction.id(), stored.status, transaction.status());
            return stored;
        }
        stored.status = status;
        stored.amountCents = transaction.amountCents();
        stored.currency = transaction.currency();
        stored.paymentMethodType = transaction.paymentMethodType();
        stored.statusMessage = transaction.statusMessage().orElse(null);
        stored.raw = transaction.raw();
        stored.providerCreatedAt = transaction.createdAt().atOffset(ZoneOffset.UTC);
        stored.finalizedAt =
                transaction.finalizedAt().map(at -> at.atOffset(ZoneOffset.UTC)).orElse(null);
        if (!known) {
            stored.persist();
        }
        return stored;
    }
}
