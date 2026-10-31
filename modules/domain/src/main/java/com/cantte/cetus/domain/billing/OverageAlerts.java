package com.cantte.cetus.domain.billing;

import java.util.List;
import java.util.Optional;

/** The shares of a subscription's overage limit whose use the billing contact hears about. */
public final class OverageAlerts {

    public static final List<Integer> PERCENTS = List.of(50, 100);

    private OverageAlerts() {}

    /** The highest share of the limit the overage documents reached; none without a limit. */
    public static Optional<Integer> reached(long used, long limit) {
        if (limit <= 0) {
            return Optional.empty();
        }
        return PERCENTS.reversed().stream()
                .filter(percent -> used * 100 >= limit * percent)
                .findFirst();
    }
}
