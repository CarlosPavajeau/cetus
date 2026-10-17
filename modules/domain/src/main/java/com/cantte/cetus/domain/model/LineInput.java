package com.cantte.cetus.domain.model;

import java.math.BigDecimal;
import java.util.List;

/** A line as requested by the client, before calculation. */
public record LineInput(
        String itemCode,
        String description,
        BigDecimal quantity,
        String unitCode,
        BigDecimal unitPrice,
        List<LineTax> taxes) {

    public LineInput {
        taxes = taxes == null ? List.of() : List.copyOf(taxes);
    }

    public record LineTax(TaxType type, BigDecimal percent) {
    }
}
