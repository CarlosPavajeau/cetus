package com.cantte.cetus.domain.billing;

/** A subscription's overage limit, kept in pesos, in documents at the period's overage price. */
public final class OverageLimit {

    private OverageLimit() {}

    /** Whole documents the limit pays for; without an overage price, every document fits. */
    public static int documents(long limitCents, long priceOverageCents) {
        if (limitCents < 0 || priceOverageCents < 0) {
            throw new IllegalArgumentException(
                    "Overage limit and price are not negative: " + limitCents + ", " + priceOverageCents);
        }
        if (priceOverageCents == 0) {
            return Integer.MAX_VALUE;
        }
        return (int) Math.min(Integer.MAX_VALUE, limitCents / priceOverageCents);
    }
}
