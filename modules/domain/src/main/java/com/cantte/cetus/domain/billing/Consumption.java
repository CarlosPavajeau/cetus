package com.cantte.cetus.domain.billing;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** What the documents an account used of a lot are worth: their share of what the lot cost, to the peso. */
public final class Consumption {

    private static final BigDecimal CENTS_PER_PESO = BigDecimal.valueOf(100);

    private Consumption() {}

    /**
     * @param totalCents what the lot cost
     * @param consumed documents of the lot used
     * @param quantity documents the lot was granted with
     */
    public static long valueCents(long totalCents, int consumed, int quantity) {
        if (totalCents < 0 || quantity <= 0 || consumed < 0 || consumed > quantity) {
            throw new IllegalArgumentException(
                    "Not a consumption: %d of %d documents worth %d".formatted(consumed, quantity, totalCents));
        }
        return BigDecimal.valueOf(totalCents)
                .multiply(BigDecimal.valueOf(consumed))
                .divide(BigDecimal.valueOf(quantity).multiply(CENTS_PER_PESO), 0, RoundingMode.HALF_UP)
                .multiply(CENTS_PER_PESO)
                .longValueExact();
    }
}
