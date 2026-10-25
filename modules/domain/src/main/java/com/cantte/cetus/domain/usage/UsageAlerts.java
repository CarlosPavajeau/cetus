package com.cantte.cetus.domain.usage;

import java.util.List;
import java.util.Optional;

/** The shares of a plan's monthly quota its billing contact hears about. */
public final class UsageAlerts {

    public static final List<Integer> PERCENTS = List.of(80, 100);

    private UsageAlerts() {}

    /**
     * The highest share of the quota the month's usage reached. Only the highest: an account moved to a smaller
     * plan above its quota hears it is over, not also that it passed 80 %.
     */
    public static Optional<Integer> reached(long total, int included) {
        if (included <= 0) {
            throw new IllegalArgumentException("A quota is positive: " + included);
        }
        return PERCENTS.reversed().stream()
                .filter(percent -> total * 100 >= (long) included * percent)
                .findFirst();
    }
}
