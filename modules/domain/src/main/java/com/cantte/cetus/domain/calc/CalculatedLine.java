package com.cantte.cetus.domain.calc;

import java.math.BigDecimal;
import java.util.List;

public record CalculatedLine(
        int number,
        String itemCode,
        String description,
        BigDecimal quantity,
        String unitCode,
        BigDecimal unitPrice,
        BigDecimal lineExtensionAmount,
        List<TaxAmount> taxes) {}
