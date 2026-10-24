package com.cantte.cetus.domain.model;

import com.cantte.cetus.domain.calc.CalculationResult;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Everything needed to build the UBL of a sales invoice. Assembled by the worker. */
public record ElectronicInvoice(
        Environment environment,
        String operationType,
        String prefix,
        long number,
        LocalDate issueDate,
        LocalTime issueTime,
        LocalDate dueDate,
        String currency,
        Party supplier,
        Party customer,
        PaymentInfo payment,
        CalculationResult calculation,
        NumberingAuthorization authorization,
        SoftwareInfo software,
        String cufe,
        String qrCode,
        List<String> notes) {

    public ElectronicInvoice {
        notes = notes == null ? List.of() : List.copyOf(notes);
    }

    public String fullNumber() {
        return prefix + number;
    }
}
