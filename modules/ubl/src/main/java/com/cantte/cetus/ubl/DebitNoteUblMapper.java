package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.ElectronicDebitNote;
import com.cantte.cetus.ubl.model.AmountType;
import com.cantte.cetus.ubl.model.Cac;
import com.cantte.cetus.ubl.model.Ext;
import com.cantte.cetus.ubl.model.IdentifierType;
import com.cantte.cetus.ubl.model.QuantityType;
import com.cantte.cetus.ubl.model.UblDebitNote;

/** Translates a domain debit note that references an invoice into the UBL model. */
public final class DebitNoteUblMapper {

    public UblDebitNote map(ElectronicDebitNote note) {
        String currency = note.currency();
        CalculationResult calc = note.calculation();

        UblDebitNote ubl = new UblDebitNote();
        ubl.ublExtensions = new Ext.UblExtensions();
        // Notes have no numbering resolution, so their extensions carry no InvoiceControl.
        ubl.ublExtensions.extensions.add(Ext.UblExtension.of(UblParts.dianExtensions(note.software(), note.qrCode())));

        ubl.ublVersionId = DianCodes.UBL_VERSION;
        ubl.customizationId = DianCodes.DEBIT_NOTE_CUSTOMIZATION;
        ubl.profileId = DianCodes.DEBIT_NOTE_PROFILE;
        ubl.profileExecutionId = note.environment().dianCode();
        ubl.id = note.fullNumber();
        ubl.uuid = IdentifierType.of(note.cude()).scheme(note.environment().dianCode(), "CUDE-SHA384");
        ubl.issueDate = DianTime.date(note.issueDate());
        ubl.issueTime = DianTime.time(note.issueTime());
        // The issuer's reason travels as a note: DBF04 expects the concept's own name in the Description.
        if (note.correctionDescription() != null
                && !note.correctionDescription().isBlank()) {
            ubl.notes.add(note.correctionDescription());
        }
        ubl.notes.addAll(note.notes());
        ubl.documentCurrencyCode = currency;
        ubl.lineCountNumeric = calc.lines().size();

        ubl.discrepancyResponse = UblParts.discrepancyResponse(note.reference(), note.concept());
        ubl.billingReference = UblParts.billingReference(note.reference());

        ubl.supplier = UblParts.supplier(note.supplier(), note.prefix());
        ubl.customer = UblParts.customer(note.customer());
        ubl.paymentMeans.add(UblParts.paymentMeans(note.payment()));
        calc.taxTotals().forEach(total -> ubl.taxTotals.add(UblParts.taxTotal(total, currency)));
        ubl.requestedMonetaryTotal = UblParts.monetaryTotal(calc.totals(), currency);
        calc.lines().forEach(line -> ubl.debitNoteLines.add(line(line, currency)));
        return ubl;
    }

    private Cac.DebitNoteLine line(CalculatedLine source, String currency) {
        Cac.DebitNoteLine line = new Cac.DebitNoteLine();
        line.id = String.valueOf(source.number());
        line.debitedQuantity = QuantityType.of(source.quantity(), UblParts.unit(source));
        line.lineExtensionAmount = AmountType.of(source.lineExtensionAmount(), currency);
        source.taxes().forEach(tax -> line.taxTotals.add(UblParts.lineTaxTotal(tax, currency)));
        line.item = UblParts.item(source);
        line.price = UblParts.price(source, currency);
        return line;
    }
}
