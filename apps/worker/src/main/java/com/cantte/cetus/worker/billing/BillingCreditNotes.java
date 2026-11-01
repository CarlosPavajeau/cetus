package com.cantte.cetus.worker.billing;

import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.PaymentReversalEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * The credit note over Cetus' own invoice for each approved reversal, issued by the invoice's issuer once the
 * invoice is accepted: all of it back cancels the invoice line by line; part of it is a partial return of the
 * service for that amount. Like the invoice, it never takes credits.
 */
@ApplicationScoped
public class BillingCreditNotes {

    private static final Logger LOG = Logger.getLogger(BillingCreditNotes.class);

    private final InvoiceCalculator calculator = new InvoiceCalculator();

    @Inject
    JobQueue jobs;

    @Inject
    ObjectMapper mapper;

    public enum Outcome {
        ISSUED,
        /** Not approved, already credited, or the order has no invoice to credit. */
        NOTHING,
        /** The order's invoice is not accepted yet: a note needs its CUFE. */
        INVOICE_PENDING
    }

    /** What the note stores as its request: the reversal it credits. */
    record Source(UUID reversalId, String reference, PaymentReversalEntity.Kind kind, long amountCents) {}

    /** Enqueued in the transaction that approves the reversal; an order without invoice gets none. */
    void on(@Observes Reversals.ReversalApproved approved) {
        BillingOrderEntity order = BillingOrderEntity.findById(approved.orderId());
        if (order.invoiceDocumentId != null) {
            jobs.enqueue(JobTypes.ISSUE_BILLING_CREDIT_NOTE, approved.reversalId());
        }
    }

    /**
     * Issues the reversal's credit note, unless it has one or there is no invoice: the reversal stays locked until
     * the note is linked to it, so a job run twice issues once.
     */
    @Transactional
    public Outcome issue(UUID reversalId) {
        PaymentReversalEntity found = PaymentReversalEntity.<PaymentReversalEntity>findByIdOptional(reversalId)
                .orElseThrow(() -> new IllegalArgumentException("No reversal " + reversalId));
        BillingOrderEntity order = BillingOrderEntity.lock(found.orderId).orElseThrow();
        PaymentReversalEntity reversal = PaymentReversalEntity.lock(reversalId).orElseThrow();
        if (reversal.status != PaymentReversalEntity.Status.APPROVED
                || reversal.creditNoteDocumentId != null
                || order.invoiceDocumentId == null) {
            return Outcome.NOTHING;
        }
        DocumentEntity invoice = DocumentEntity.findById(order.invoiceDocumentId);
        if (invoice.status != DocumentStatus.ACCEPTED) {
            return Outcome.INVOICE_PENDING;
        }
        IssuerEntity issuer = IssuerEntity.findById(invoice.issuerId);
        BillingInvoices.requireReady(issuer);

        boolean whole = reversal.amountCents == order.totalCents;
        List<LineInput> lines = whole
                ? BillingOrderItemEntity.listByOrder(order.id).stream()
                        .map(BillingInvoices::line)
                        .toList()
                : List.of(new LineInput(
                        "DEVOLUCION",
                        "Devolución parcial de la orden " + order.reference,
                        BigDecimal.ONE,
                        "94",
                        BigDecimal.valueOf(reversal.amountCents).movePointLeft(2),
                        List.of()));
        CalculationResult calculation = calculator.calculate(lines);
        BigDecimal amount = BigDecimal.valueOf(reversal.amountCents).movePointLeft(2);
        if (calculation.totals().payableAmount().compareTo(amount) != 0) {
            throw new IllegalStateException("The credit note of reversal " + reversal.id + " comes to "
                    + calculation.totals().payableAmount() + " and the reversal to " + amount);
        }
        BigDecimal balance = DocumentEntity.creditableBalance(invoice);
        if (amount.compareTo(balance) > 0) {
            throw new IllegalStateException("Reversal " + reversal.id + " credits " + amount + " and invoice "
                    + invoice.id + " has " + balance + " left to credit");
        }

        ZonedDateTime now = ZonedDateTime.now(DianTime.ZONE).truncatedTo(ChronoUnit.SECONDS);
        DocumentEntity note = DocumentEntity.draft(
                issuer.accountId, issuer, issuer.environment, DocumentType.CREDIT_NOTE, calculation, now);
        note.referencedDocumentId = invoice.id;
        note.correctionConcept = (whole ? CreditNoteConcept.CANCELLATION : CreditNoteConcept.PARTIAL_RETURN).name();
        note.correctionDescription = (reversal.kind == PaymentReversalEntity.Kind.REFUND
                        ? "Reembolso de la orden "
                        : "Contracargo de la orden ")
                + order.reference;
        note.currency = invoice.currency;
        note.customer = invoice.customer;
        note.payment = invoice.payment;
        note.notes = List.of("Orden " + order.reference);
        note.externalReference = reversal.reference;
        note.requestPayload = payload(reversal);
        note.persistAndFlush();
        jobs.enqueue(JobTypes.PROCESS_DOCUMENT, note.id);
        reversal.creditNoteDocumentId = note.id;
        LOG.infof("Document %s credits reversal %s of order %s", note.id, reversal.id, order.id);
        return Outcome.ISSUED;
    }

    private String payload(PaymentReversalEntity reversal) {
        try {
            return mapper.writeValueAsString(
                    new Source(reversal.id, reversal.reference, reversal.kind, reversal.amountCents));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize the credit note of reversal " + reversal.id, e);
        }
    }
}
