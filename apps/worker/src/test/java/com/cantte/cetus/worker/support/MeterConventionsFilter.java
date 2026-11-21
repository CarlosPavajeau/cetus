package com.cantte.cetus.worker.support;

import com.cantte.cetus.lint.telemetry.MeterConventions;
import io.micrometer.core.instrument.config.MeterFilter;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;

public class MeterConventionsFilter {

    @Produces
    @Singleton
    MeterFilter attributesFromTheClosedList() {
        return MeterConventions.attributesFromTheClosedList();
    }
}
