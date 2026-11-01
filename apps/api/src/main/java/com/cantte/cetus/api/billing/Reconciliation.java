package com.cantte.cetus.api.billing;

import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.PaymentReversalEntity;
import com.cantte.cetus.persistence.entity.PaymentTransactionEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * A month of Cetus' sales, Colombia time, crossed three ways: the orders paid, the transactions Wompi approved for
 * them and the invoices issued, plus the money that went back with its credit notes. It reads what Cetus stored;
 * {@link #refresh} asks Wompi again for the month's orders first.
 */
@ApplicationScoped
public class Reconciliation {

    /** What does not add up in an order. */
    public enum Issue {
        /** Paid with no approved transaction, and no money back that explains it. */
        PAYMENT_MISSING,
        /** The approved transaction is for another amount. */
        PAYMENT_AMOUNT_MISMATCH,
        /** More than one approved transaction: the customer paid twice. */
        PAYMENT_DUPLICATE,
        /** An approved transaction of an order that is not paid. */
        PAYMENT_UNMATCHED,
        /** Paid and its invoice is not accepted. */
        INVOICE_MISSING,
        /** Money went back from an invoiced order and its credit note is not accepted. */
        CREDIT_NOTE_MISSING,
        /** A Wompi refund with no decision. */
        REFUND_UNRESOLVED,
        /** A payment left the order for a person to review. */
        REVIEW_PENDING
    }

    @Schema(description = "A Wompi transaction of the order")
    public record PaymentView(
            String transactionId,
            PaymentTransactionEntity.Status status,
            long amountCents,
            String paymentMethodType,
            @Schema(nullable = true) OffsetDateTime finalizedAt) {}

    @Schema(description = "An electronic document of Cetus' own issuer")
    public record DocumentView(UUID id, String number, DocumentStatus status, BigDecimal payableAmount) {}

    @Schema(description = "Money that went back from the order")
    public record ReversalLineView(
            String reference,
            PaymentReversalEntity.Kind kind,
            PaymentReversalEntity.Status status,
            long amountCents,
            @Schema(nullable = true) OffsetDateTime approvedAt,
            @Schema(nullable = true) DocumentView creditNote) {}

    @Schema(description = "An order of the month and what does not add up in it")
    public record OrderLineView(
            UUID orderId,
            UUID accountId,
            String reference,
            BillingOrderEntity.Kind kind,
            BillingOrderEntity.Status status,
            long totalCents,
            @Schema(nullable = true) OffsetDateTime paidAt,
            List<PaymentView> payments,
            @Schema(nullable = true) DocumentView invoice,
            List<ReversalLineView> reversals,
            List<Issue> issues) {}

    @Schema(description = "A month of sales crossed with Wompi and the invoices, in cents of COP")
    public record ReconciliationView(
            String month,

            @Schema(description = "Orders paid in the month")
            long paidCents,

            @Schema(description = "Money that went back in the month, from orders of any month")
            long reversedCents,

            long netCents,

            @Schema(description = "Accepted invoices of the orders paid in the month")
            long invoicedCents,

            @Schema(description = "Accepted credit notes of the money that went back in the month")
            long creditedCents,

            @Schema(description = "Orders with something that does not add up")
            int ordersWithIssues,

            List<OrderLineView> orders) {}

    @Inject
    EntityManager em;

    @Inject
    JobQueue jobs;

    @Transactional(Transactional.TxType.MANDATORY)
    public ReconciliationView month(YearMonth month) {
        OffsetDateTime from = month.atDay(1).atStartOfDay(Revenue.COLOMBIA).toOffsetDateTime();
        OffsetDateTime to =
                month.plusMonths(1).atDay(1).atStartOfDay(Revenue.COLOMBIA).toOffsetDateTime();
        List<UUID> ids = orderIds(from, to);
        List<BillingOrderEntity> orders = ids.isEmpty()
                ? List.of()
                : BillingOrderEntity.list("id in ?1 order by coalesce(paidAt, createdAt), id", ids);
        if (ids.isEmpty()) {
            return new ReconciliationView(month.toString(), 0, 0, 0, 0, 0, 0, List.of());
        }
        Map<UUID, List<PaymentTransactionEntity>> payments = PaymentTransactionEntity.<PaymentTransactionEntity>list(
                        "orderId in ?1 and status in ?2 order by providerCreatedAt",
                        ids,
                        List.of(PaymentTransactionEntity.Status.APPROVED, PaymentTransactionEntity.Status.VOIDED))
                .stream()
                .collect(Collectors.groupingBy(payment -> payment.orderId));
        Map<UUID, List<PaymentReversalEntity>> reversals = PaymentReversalEntity.listByOrders(ids).stream()
                .collect(Collectors.groupingBy(reversal -> reversal.orderId));
        Map<UUID, DocumentView> documents = documents(Stream.concat(
                        orders.stream().map(order -> order.invoiceDocumentId),
                        reversals.values().stream()
                                .flatMap(List::stream)
                                .map(reversal -> reversal.creditNoteDocumentId))
                .filter(Objects::nonNull)
                .toList());

        List<OrderLineView> lines = new ArrayList<>();
        long paidCents = 0;
        long reversedCents = 0;
        long invoicedCents = 0;
        long creditedCents = 0;
        for (BillingOrderEntity order : orders) {
            List<PaymentTransactionEntity> own = payments.getOrDefault(order.id, List.of());
            List<PaymentReversalEntity> back = reversals.getOrDefault(order.id, List.of());
            Optional<DocumentView> invoice =
                    Optional.ofNullable(order.invoiceDocumentId).map(documents::get);
            boolean paidInMonth = within(order.paidAt, from, to);
            if (paidInMonth) {
                paidCents += order.totalCents;
                invoicedCents += invoice.filter(Reconciliation::accepted)
                        .map(doc -> doc.payableAmount().movePointRight(2).longValueExact())
                        .orElse(0L);
            }
            List<ReversalLineView> backLines = new ArrayList<>();
            for (PaymentReversalEntity reversal : back) {
                Optional<DocumentView> note =
                        Optional.ofNullable(reversal.creditNoteDocumentId).map(documents::get);
                if (reversal.status == PaymentReversalEntity.Status.APPROVED && within(reversal.approvedAt, from, to)) {
                    reversedCents += reversal.amountCents;
                    creditedCents += note.filter(Reconciliation::accepted)
                            .map(doc -> doc.payableAmount().movePointRight(2).longValueExact())
                            .orElse(0L);
                }
                backLines.add(new ReversalLineView(
                        reversal.reference,
                        reversal.kind,
                        reversal.status,
                        reversal.amountCents,
                        reversal.approvedAt,
                        note.orElse(null)));
            }
            List<Issue> issues = issues(order, own, invoice, back, documents);
            lines.add(new OrderLineView(
                    order.id,
                    order.accountId,
                    order.reference,
                    order.kind,
                    order.status,
                    order.totalCents,
                    order.paidAt,
                    own.stream()
                            .map(payment -> new PaymentView(
                                    payment.providerTransactionId,
                                    payment.status,
                                    payment.amountCents,
                                    payment.paymentMethodType,
                                    payment.finalizedAt))
                            .toList(),
                    invoice.orElse(null),
                    backLines,
                    issues));
        }
        return new ReconciliationView(
                month.toString(),
                paidCents,
                reversedCents,
                paidCents - reversedCents,
                invoicedCents,
                creditedCents,
                (int) lines.stream().filter(line -> !line.issues().isEmpty()).count(),
                lines);
    }

    /**
     * Asks Wompi again for the payments of the month's orders, so the report reads what Wompi has now.
     *
     * @return the orders whose check is enqueued; one with a check already waiting gets no other
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public List<UUID> refresh(YearMonth month) {
        OffsetDateTime from = month.atDay(1).atStartOfDay(Revenue.COLOMBIA).toOffsetDateTime();
        OffsetDateTime to =
                month.plusMonths(1).atDay(1).atStartOfDay(Revenue.COLOMBIA).toOffsetDateTime();
        List<UUID> waiting = em.createNativeQuery("""
                        SELECT j.reference_id FROM billing.jobs j
                        WHERE j.job_type = :type AND j.status IN ('PENDING', 'RUNNING')
                        """, UUID.class)
                .setParameter("type", JobTypes.CHECK_PAYMENT)
                .getResultList();
        List<UUID> orders = orderIds(from, to).stream()
                .filter(order -> !waiting.contains(order))
                .toList();
        orders.forEach(order -> jobs.enqueue(JobTypes.CHECK_PAYMENT, order));
        return orders;
    }

    /** Orders paid in the month, with money back in it, or with a payment approved in it that did not pay them. */
    private List<UUID> orderIds(OffsetDateTime from, OffsetDateTime to) {
        return em.createNativeQuery("""
                        SELECT o.id FROM billing.billing_orders o
                        WHERE o.paid_at >= :from AND o.paid_at < :to
                        UNION
                        SELECT r.order_id FROM billing.payment_reversals r
                        WHERE (r.approved_at >= :from AND r.approved_at < :to)
                           OR (r.status IN ('REQUESTED', 'SUBMITTED') AND r.created_at < :to)
                        UNION
                        SELECT t.order_id FROM billing.payment_transactions t
                        JOIN billing.billing_orders o ON o.id = t.order_id
                        WHERE t.status = 'APPROVED' AND o.paid_at IS NULL
                          AND coalesce(t.finalized_at, t.created_at) >= :from
                          AND coalesce(t.finalized_at, t.created_at) < :to
                        """, UUID.class)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();
    }

    private static List<Issue> issues(
            BillingOrderEntity order,
            List<PaymentTransactionEntity> payments,
            Optional<DocumentView> invoice,
            List<PaymentReversalEntity> reversals,
            Map<UUID, DocumentView> documents) {
        List<Issue> issues = new ArrayList<>();
        List<PaymentTransactionEntity> approved = payments.stream()
                .filter(payment -> payment.status == PaymentTransactionEntity.Status.APPROVED)
                .toList();
        boolean paid = order.paidAt != null;
        boolean reversed =
                reversals.stream().anyMatch(reversal -> reversal.status == PaymentReversalEntity.Status.APPROVED);
        if (paid && approved.isEmpty() && !reversed) {
            issues.add(Issue.PAYMENT_MISSING);
        }
        if (approved.stream()
                .anyMatch(payment ->
                        payment.amountCents != order.totalCents || !order.currency.equals(payment.currency))) {
            issues.add(Issue.PAYMENT_AMOUNT_MISMATCH);
        }
        if (approved.size() > 1) {
            issues.add(Issue.PAYMENT_DUPLICATE);
        }
        if (!paid && !approved.isEmpty()) {
            issues.add(Issue.PAYMENT_UNMATCHED);
        }
        if (paid && invoice.filter(Reconciliation::accepted).isEmpty()) {
            issues.add(Issue.INVOICE_MISSING);
        }
        boolean creditNoteMissing = order.invoiceDocumentId != null
                && reversals.stream()
                        .filter(reversal -> reversal.status == PaymentReversalEntity.Status.APPROVED)
                        .anyMatch(reversal -> Optional.ofNullable(reversal.creditNoteDocumentId)
                                .map(documents::get)
                                .filter(Reconciliation::accepted)
                                .isEmpty());
        if (creditNoteMissing) {
            issues.add(Issue.CREDIT_NOTE_MISSING);
        }
        if (reversals.stream().anyMatch(reversal -> reversal.status == PaymentReversalEntity.Status.SUBMITTED)) {
            issues.add(Issue.REFUND_UNRESOLVED);
        }
        if (order.reviewReason != null) {
            issues.add(Issue.REVIEW_PENDING);
        }
        return issues;
    }

    private static Map<UUID, DocumentView> documents(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return DocumentEntity.<DocumentEntity>list("id in ?1", ids).stream()
                .map(doc -> new DocumentView(doc.id, doc.fullNumber(), doc.status, doc.payableAmount))
                .collect(Collectors.toMap(DocumentView::id, Function.identity()));
    }

    private static boolean accepted(DocumentView doc) {
        return doc.status() == DocumentStatus.ACCEPTED;
    }

    private static boolean within(OffsetDateTime at, OffsetDateTime from, OffsetDateTime to) {
        return at != null && !at.isBefore(from) && at.isBefore(to);
    }
}
