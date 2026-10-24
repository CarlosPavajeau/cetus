package com.cantte.cetus.domain.model;

import com.cantte.cetus.domain.calc.CalculationResult;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Everything needed to build the UBL of a credit note that references an invoice. Assembled by the
 * worker. Notes carry no numbering authorization and are identified by a CUDE instead of a CUFE.
 */
public record ElectronicCreditNote(
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
        CreditNoteConcept concept,
        String correctionDescription,
        SoftwareInfo software,
        String cude,
        String qrCode,
        List<String> notes) {

    public ElectronicCreditNote {
        notes = notes == null ? List.of() : List.copyOf(notes);
    }

    public String fullNumber() {
        return prefix + number;
    }
}
