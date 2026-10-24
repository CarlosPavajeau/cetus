package com.cantte.cetus.domain.model;

import com.cantte.cetus.domain.calc.CalculationResult;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Everything needed to build the UBL of a debit note that references an invoice. Assembled by the
 * worker. Notes carry no numbering authorization and are identified by a CUDE instead of a CUFE.
 */
public record ElectronicDebitNote(
        Environment environment,
        String prefix,
        long number,
        LocalDate issueDate,
        LocalTime issueTime,
        String currency,
        Party supplier,
        Party customer,
        PaymentInfo payment,
        CalculationResult calculation,
        BillingReference reference,
        DebitNoteConcept concept,
        String correctionDescription,
        SoftwareInfo software,
        String cude,
        String qrCode,
        List<String> notes)
        implements ElectronicNote {

    public ElectronicDebitNote {
        notes = notes == null ? List.of() : List.copyOf(notes);
    }

    @Override
    public String fullNumber() {
        return prefix + number;
    }
}
