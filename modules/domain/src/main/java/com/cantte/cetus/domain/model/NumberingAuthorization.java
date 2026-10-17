package com.cantte.cetus.domain.model;

import java.time.LocalDate;

/** Numbering resolution granted by the DIAN (InvoiceControl in the DIAN extensions). */
public record NumberingAuthorization(
        String resolutionNumber,
        LocalDate startDate,
        LocalDate endDate,
        String prefix,
        long from,
        long to) {
}
