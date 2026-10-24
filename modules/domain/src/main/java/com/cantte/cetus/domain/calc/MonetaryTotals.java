package com.cantte.cetus.domain.calc;

import java.math.BigDecimal;

/** LegalMonetaryTotal of the UBL document. */
public record MonetaryTotals(
        BigDecimal lineExtensionAmount,
        BigDecimal taxExclusiveAmount,
        BigDecimal taxInclusiveAmount,
        BigDecimal allowanceTotalAmount,
        BigDecimal chargeTotalAmount,
        BigDecimal prepaidAmount,
        BigDecimal payableAmount) {}
