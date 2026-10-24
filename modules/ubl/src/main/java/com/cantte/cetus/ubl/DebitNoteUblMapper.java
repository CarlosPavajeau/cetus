package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.model.ElectronicDebitNote;
import com.cantte.cetus.ubl.model.Cac;
import com.cantte.cetus.ubl.model.QuantityType;
import com.cantte.cetus.ubl.model.UblDebitNote;

/** Translates a domain debit note that references an invoice into the UBL model. */
public final class DebitNoteUblMapper {

    public UblDebitNote map(ElectronicDebitNote note) {
        String currency = note.currency();
        CalculationResult calc = note.calculation();

        UblDebitNote ubl = new UblDebitNote();
        UblParts.note(ubl, note, DianCodes.DEBIT_NOTE_CUSTOMIZATION, DianCodes.DEBIT_NOTE_PROFILE);
        ubl.requestedMonetaryTotal = UblParts.monetaryTotal(calc.totals(), currency);
        calc.lines().forEach(line -> ubl.debitNoteLines.add(line(line, currency)));
        return ubl;
    }

    private Cac.DebitNoteLine line(CalculatedLine source, String currency) {
        Cac.DebitNoteLine line = UblParts.line(new Cac.DebitNoteLine(), source, currency);
        line.debitedQuantity = QuantityType.of(source.quantity(), UblParts.unit(source));
        return line;
    }
}
