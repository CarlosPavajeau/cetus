package com.cantte.cetus.api.creditnotes;

import com.cantte.cetus.api.documents.DocumentDrafts;
import com.cantte.cetus.api.invoices.InvoiceService;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.DocumentLineEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Creates a credit note against an accepted invoice of the same account and environment. The invoice
 * is locked while the balance is checked, so concurrent notes cannot credit more than it is worth.
 */
@ApplicationScoped
public class CreditNoteService {

    private final InvoiceCalculator calculator = new InvoiceCalculator();

    @Inject
    DocumentDrafts drafts;

    @Transactional(Transactional.TxType.MANDATORY)
    public DocumentEntity create(UUID accountId, Environment environment, CreditNoteRequest request, String rawJson) {
        DocumentEntity invoice = DocumentEntity.lockForAccount(accountId, request.invoiceId(), environment)
                .filter(doc -> doc.documentType == DocumentType.INVOICE)
                .orElseThrow(() -> new NotFoundException("Invoice not found"));
        if (invoice.status != DocumentStatus.ACCEPTED) {
            throw new DomainException("invoice_not_accepted",
                    "Only invoices accepted by the DIAN can be credited; this one is " + invoice.status);
        }
        IssuerEntity issuer = IssuerEntity.findById(invoice.issuerId);
        drafts.ensureReady(issuer, environment);

        CalculationResult calculation = calculator.calculate(lines(request, invoice));
        BigDecimal balance = DocumentEntity.creditableBalance(invoice);
        if (calculation.totals().payableAmount().compareTo(balance) > 0) {
            throw new DomainException("credit_note_exceeds_balance",
                    "The credit note totals " + calculation.totals().payableAmount()
                            + " but only " + balance + " of the invoice is left to credit");
        }

        DocumentEntity note = drafts.draft(accountId, issuer, environment, DocumentType.CREDIT_NOTE, calculation);
        note.referencedDocumentId = invoice.id;
        note.correctionConcept = request.concept().name();
        note.correctionDescription = request.description();
        note.currency = invoice.currency;
        note.customer = invoice.customer;
        note.payment = invoice.payment;
        note.notes = request.notes() == null ? List.of() : List.copyOf(request.notes());
        note.requestPayload = rawJson;
        note.externalReference = request.externalReference();
        drafts.submit(note);
        return note;
    }

    /** The lines sent, or, for a cancellation without lines, every line of the invoice. */
    private static List<LineInput> lines(CreditNoteRequest request, DocumentEntity invoice) {
        if (request.lines() != null && !request.lines().isEmpty()) {
            return InvoiceService.toLines(request.lines());
        }
        if (request.concept() != CreditNoteConcept.CANCELLATION) {
            throw new DomainException("credit_note_lines_required",
                    "Send the lines to credit; only a CANCELLATION can leave them out to credit the whole invoice");
        }
        return invoice.lines.stream().map(line -> copy(line, invoice)).toList();
    }

    private static LineInput copy(DocumentLineEntity line, DocumentEntity invoice) {
        List<LineInput.LineTax> taxes = invoice.taxes.stream()
                .filter(tax -> tax.line != null && tax.line.id.equals(line.id))
                .map(tax -> new LineInput.LineTax(tax.taxType, tax.percent))
                .toList();
        return new LineInput(line.itemCode, line.description, line.quantity, line.unitCode, line.unitPrice, taxes);
    }
}
