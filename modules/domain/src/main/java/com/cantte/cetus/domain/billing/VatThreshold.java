package com.cantte.cetus.domain.billing;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * The yearly gross income, in UVT, up to which Cetus' holder stays not responsible for VAT, and the shares of it
 * the admins hear about. The UVT's value and the threshold change every year and come from configuration, once the
 * accountant confirms them.
 */
public record VatThreshold(long uvtValueCop, int uvt, List<Integer> alertPercents) {

    public VatThreshold {
        if (uvtValueCop <= 0 || uvt <= 0) {
            throw new IllegalArgumentException(
                    "The UVT value and the threshold are positive: " + uvtValueCop + ", " + uvt);
        }
        if (alertPercents.isEmpty() || alertPercents.stream().anyMatch(percent -> percent <= 0 || percent > 100)) {
            throw new IllegalArgumentException("Alert shares are between 1 and 100 %: " + alertPercents);
        }
        alertPercents = alertPercents.stream().sorted().distinct().toList();
    }

    public long limitCents() {
        return Math.multiplyExact(Math.multiplyExact(uvtValueCop, uvt), 100L);
    }

    /** The highest alert share the year's income reached, if any. */
    public Optional<Integer> reached(long revenueCents) {
        return crossed(revenueCents).stream().max(Comparator.naturalOrder());
    }

    /** Every alert share the year's income reached, lowest first. */
    public List<Integer> crossed(long revenueCents) {
        return alertPercents.stream()
                .filter(percent -> revenueCents * 100 >= limitCents() * percent)
                .toList();
    }
}
