package com.cantte.cetus.domain.calc;

import com.cantte.cetus.domain.model.TaxType;
import java.math.BigDecimal;
import java.util.List;

/** Total for one tax type, broken down by rate. */
public record TaxTotal(TaxType type, BigDecimal amount, List<TaxAmount> subtotals) {}
