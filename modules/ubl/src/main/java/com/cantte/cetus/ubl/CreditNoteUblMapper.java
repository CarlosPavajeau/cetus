package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.BillingReference;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.ElectronicCreditNote;
import com.cantte.cetus.ubl.model.AmountType;
import com.cantte.cetus.ubl.model.Cac;
import com.cantte.cetus.ubl.model.Ext;
import com.cantte.cetus.ubl.model.IdentifierType;
import com.cantte.cetus.ubl.model.QuantityType;
import com.cantte.cetus.ubl.model.UblCreditNote;

/** Translates a domain credit note that references an invoice into the UBL model. */
public final class CreditNoteUblMapper {

    public UblCreditNote map(ElectronicCreditNote note) {
        String currency = note.currency();
        CalculationResult calc = note.calculation();

        UblCreditNote ubl = new UblCreditNote();
        ubl.ublExtensions = new Ext.UblExtensions();
        // Notes have no numbering resolution, so their extensions carry no InvoiceControl.
        ubl.ublExtensions.extensions.add(Ext.UblExtension.of(UblParts.dianExtensions(note.software(), note.qrCode())));

        ubl.ublVersionId = DianCodes.UBL_VERSION;
        ubl.customizationId = DianCodes.CREDIT_NOTE_CUSTOMIZATION;
        ubl.profileId = DianCodes.CREDIT_NOTE_PROFILE;
        ubl.profileExecutionId = note.environment().dianCode();
        ubl.id = note.fullNumber();
        ubl.uuid = IdentifierType.of(note.cude()).scheme(note.environment().dianCode(), "CUDE-SHA384");
        ubl.issueDate = DianTime.date(note.issueDate());
        ubl.issueTime = DianTime.time(note.issueTime());
        ubl.creditNoteTypeCode = DocumentType.CREDIT_NOTE.dianCode();
        // The issuer's reason travels as a note: CBF04 expects the concept's own name in the Description.
        if (note.correctionDescription() != null && !note.correctionDescription().isBlank()) {
            ubl.notes.add(note.correctionDescription());
        }
        ubl.notes.addAll(note.notes());
        ubl.documentCurrencyCode = currency;
        ubl.lineCountNumeric = calc.lines().size();

        BillingReference reference = note.reference();
        ubl.discrepancyResponse = new Cac.DiscrepancyResponse();
        ubl.discrepancyResponse.referenceId = reference.number();
        ubl.discrepancyResponse.responseCode = note.concept().dianCode();
        ubl.discrepancyResponse.description = note.concept().dianName();

        ubl.billingReference = new Cac.BillingReference();
        ubl.billingReference.invoiceDocumentReference = new Cac.DocumentReference();
        ubl.billingReference.invoiceDocumentReference.id = reference.number();
        ubl.billingReference.invoiceDocumentReference.uuid = IdentifierType.of(reference.cufe()).scheme(null, "CUFE-SHA384");
        ubl.billingReference.invoiceDocumentReference.issueDate = DianTime.date(reference.issueDate());

        ubl.supplier = UblParts.supplier(note.supplier(), note.prefix());
        ubl.customer = UblParts.customer(note.customer());
        ubl.paymentMeans.add(UblParts.paymentMeans(note.payment()));
        calc.taxTotals().forEach(total -> ubl.taxTotals.add(UblParts.taxTotal(total, currency)));
        ubl.legalMonetaryTotal = UblParts.monetaryTotal(calc.totals(), currency);
        calc.lines().forEach(line -> ubl.creditNoteLines.add(line(line, currency)));
        return ubl;
    }

    private Cac.CreditNoteLine line(CalculatedLine source, String currency) {
        Cac.CreditNoteLine line = new Cac.CreditNoteLine();
        line.id = String.valueOf(source.number());
        line.creditedQuantity = QuantityType.of(source.quantity(), UblParts.unit(source));
        line.lineExtensionAmount = AmountType.of(source.lineExtensionAmount(), currency);
        source.taxes().forEach(tax -> line.taxTotals.add(UblParts.lineTaxTotal(tax, currency)));
        line.item = UblParts.item(source);
        line.price = UblParts.price(source, currency);
        return line;
    }
}
