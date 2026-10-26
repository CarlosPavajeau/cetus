package com.cantte.cetus.api.telemetry;

import io.micrometer.core.instrument.config.MeterFilter;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;

public class MeterFilters {

    /**
     * A timer with buckets also registers a gauge per bucket (name.histogram), which the OpenTelemetry bridge
     * exports next to the histogram it already sends: the same series twice.
     */
    @Produces
    @Singleton
    MeterFilter withoutBucketGauges() {
        return MeterFilter.deny(id -> id.getName().endsWith(".histogram"));
    }
}
