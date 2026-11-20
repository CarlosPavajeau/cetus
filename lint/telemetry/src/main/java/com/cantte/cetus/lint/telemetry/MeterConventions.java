package com.cantte.cetus.lint.telemetry;

import io.micrometer.core.instrument.Meter;
import io.micrometer.core.instrument.Tag;
import io.micrometer.core.instrument.config.MeterFilter;
import java.util.Set;
import java.util.function.Predicate;

public final class MeterConventions {

    public static final String PREFIX = "cetus.";

    /** Each attribute multiplies the series a metric exports; adding one needs review. */
    public static final Set<String> ATTRIBUTES =
            Set.of("document.type", "environment", "outcome", "dian.operation", "job.type", "error.kind", "cache.name");

    private MeterConventions() {}

    public static MeterFilter attributesFromTheClosedList() {
        return new MeterFilter() {
            @Override
            public Meter.Id map(Meter.Id id) {
                if (!id.getName().startsWith(PREFIX)) {
                    return id;
                }
                var attributesUnknown = id.getTags().stream()
                        .map(Tag::getKey)
                        .filter(Predicate.not(ATTRIBUTES::contains))
                        .sorted()
                        .toList();
                if (!attributesUnknown.isEmpty()) {
                    throw new IllegalStateException(
                            ("Metric %s has attributes outside the closed list %s: %s. IDs go in"
                                            + " spans and logs, never in metrics; another attribute needs review and an entry"
                                            + " in MeterConventions.ATTRIBUTES.")
                                    .formatted(
                                            id.getName(),
                                            ATTRIBUTES.stream().sorted().toList(),
                                            attributesUnknown));
                }
                return id;
            }
        };
    }
}
