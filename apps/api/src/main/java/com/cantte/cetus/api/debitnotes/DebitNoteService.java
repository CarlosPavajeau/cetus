package com.cantte.cetus.api.debitnotes;

import com.cantte.cetus.api.documents.DocumentDrafts;
import com.cantte.cetus.api.invoices.InvoiceService;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.UUID;

/**
 * Creates a debit note against an accepted invoice of the same account and environment. A debit note
 * adds to the invoice, so it has no balance to respect; the invoice is still locked, so it cannot
 * change under a credit note being created at the same time.
 */
@ApplicationScoped
public class DebitNoteService {

    private final InvoiceCalculator calculator = new InvoiceCalculator();

    @Inject
    DocumentDrafts drafts;

    @Transactional(Transactional.TxType.MANDATORY)
    public DocumentEntity create(UUID accountId, Environment environment, DebitNoteRequest request, String rawJson) {
        DocumentEntity invoice = drafts.lockCorrectedInvoice(accountId, environment, request, "debited");
        IssuerEntity issuer = IssuerEntity.findById(invoice.issuerId);
        drafts.ensureReady(issuer, environment);

        CalculationResult calculation = calculator.calculate(InvoiceService.toLines(request.lines()));
        DocumentEntity note = drafts.draft(accountId, issuer, environment, DocumentType.DEBIT_NOTE, calculation);
        drafts.submitCorrection(note, invoice, request, rawJson);
        return note;
    }
}
