package com.cantte.cetus.domain.calc;

import com.cantte.cetus.domain.model.TaxType;
import java.math.BigDecimal;

public record TaxAmount(TaxType type, BigDecimal percent, BigDecimal taxableAmount, BigDecimal amount) {}
