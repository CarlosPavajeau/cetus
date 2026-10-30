package com.cantte.cetus.domain.billing;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * A price in cents, as Wompi takes it, split into base and tax. With the tax included (the catalog's prices are
 * final), the base is the price over one plus the rate, rounded half up to the peso, and the tax is the rest, so
 * base and tax always add up to the price. Without it, the tax is the base times the rate, rounded the same way.
 * A rate of 0, while Cetus is not responsible for VAT, leaves the price whole as the base.
 */
public record Price(long cents, boolean taxIncluded, BigDecimal taxRate) {

    private static final BigDecimal CENTS_PER_PESO = BigDecimal.valueOf(100);

    public Price {
        Objects.requireNonNull(taxRate, "taxRate");
        if (cents < 0) {
            throw new IllegalArgumentException("A price is not negative: " + cents);
        }
        if (taxRate.signum() < 0 || taxRate.compareTo(BigDecimal.ONE) >= 0) {
            throw new IllegalArgumentException("A tax rate is between 0 and 1: " + taxRate);
        }
    }

    public long baseCents() {
        if (taxRate.signum() == 0) {
            return cents;
        }
        return taxIncluded
                ? toPeso(BigDecimal.valueOf(cents).divide(BigDecimal.ONE.add(taxRate), 6, RoundingMode.HALF_UP))
                : cents;
    }

    public long taxCents() {
        if (taxRate.signum() == 0) {
            return 0;
        }
        return taxIncluded
                ? cents - baseCents()
                : toPeso(BigDecimal.valueOf(cents).multiply(taxRate));
    }

    public long totalCents() {
        return baseCents() + taxCents();
    }

    private static long toPeso(BigDecimal cents) {
        return cents.divide(CENTS_PER_PESO, 0, RoundingMode.HALF_UP)
                .multiply(CENTS_PER_PESO)
                .longValueExact();
    }
}
