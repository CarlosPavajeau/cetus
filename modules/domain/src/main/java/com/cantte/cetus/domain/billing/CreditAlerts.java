package com.cantte.cetus.domain.billing;

import java.util.List;
import java.util.Optional;

/** The shares of the credits in force whose use the billing contact hears about. */
public final class CreditAlerts {

    public static final List<Integer> PERCENTS = List.of(80, 95);

    private CreditAlerts() {}

    /**
     * The highest share of the granted credits the used ones reached. Only the highest: an account that jumps past
     * both hears it is at 95 %, not also at 80 %.
     */
    public static Optional<Integer> reached(long used, long granted) {
        if (granted <= 0) {
            throw new IllegalArgumentException("Credits granted are positive: " + granted);
        }
        return PERCENTS.reversed().stream()
                .filter(percent -> used * 100 >= granted * percent)
                .findFirst();
    }
}
