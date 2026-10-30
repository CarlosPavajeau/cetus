package com.cantte.cetus.domain.billing;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/** A price before tax, in cents as Wompi takes it, and the tax rate that applies to it (0.19 is 19 %). */
public record Price(long amountCents, BigDecimal taxRate) {

    public Price {
        Objects.requireNonNull(taxRate, "taxRate");
        if (amountCents < 0) {
            throw new IllegalArgumentException("A price is not negative: " + amountCents);
        }
        if (taxRate.signum() < 0 || taxRate.compareTo(BigDecimal.ONE) >= 0) {
            throw new IllegalArgumentException("A tax rate is between 0 and 1: " + taxRate);
        }
    }

    /** Rounded half up to the cent. */
    public long taxCents() {
        return BigDecimal.valueOf(amountCents)
                .multiply(taxRate)
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();
    }

    public long totalCents() {
        return amountCents + taxCents();
    }
}
