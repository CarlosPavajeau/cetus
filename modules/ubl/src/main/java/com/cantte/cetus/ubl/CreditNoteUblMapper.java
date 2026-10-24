package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.ElectronicCreditNote;
import com.cantte.cetus.ubl.model.Cac;
import com.cantte.cetus.ubl.model.QuantityType;
import com.cantte.cetus.ubl.model.UblCreditNote;

/** Translates a domain credit note that references an invoice into the UBL model. */
public final class CreditNoteUblMapper {

    public UblCreditNote map(ElectronicCreditNote note) {
        String currency = note.currency();
        CalculationResult calc = note.calculation();

        UblCreditNote ubl = new UblCreditNote();
        UblParts.note(ubl, note, DianCodes.CREDIT_NOTE_CUSTOMIZATION, DianCodes.CREDIT_NOTE_PROFILE);
        ubl.creditNoteTypeCode = DocumentType.CREDIT_NOTE.dianCode();
        ubl.legalMonetaryTotal = UblParts.monetaryTotal(calc.totals(), currency);
        calc.lines().forEach(line -> ubl.creditNoteLines.add(line(line, currency)));
        return ubl;
    }

    private Cac.CreditNoteLine line(CalculatedLine source, String currency) {
        Cac.CreditNoteLine line = UblParts.line(new Cac.CreditNoteLine(), source, currency);
        line.creditedQuantity = QuantityType.of(source.quantity(), UblParts.unit(source));
        return line;
    }
}
