package com.cantte.cetus.domain.calc;

import com.cantte.cetus.domain.model.TaxType;
import java.math.BigDecimal;
import java.util.List;

public record CalculationResult(List<CalculatedLine> lines, List<TaxTotal> taxTotals, MonetaryTotals totals) {

    /** Total for a tax type, or zero when the document does not include it (needed for the CUFE). */
    public BigDecimal taxAmount(TaxType type) {
        return taxTotals.stream()
                .filter(total -> total.type() == type)
                .map(TaxTotal::amount)
                .findFirst()
                .orElse(Amounts.round(BigDecimal.ZERO));
    }
}
