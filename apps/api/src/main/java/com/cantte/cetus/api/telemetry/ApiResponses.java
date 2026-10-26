package com.cantte.cetus.api.telemetry;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.runtime.Startup;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.core.Response.Status.Family;
import java.util.EnumMap;
import java.util.Locale;
import java.util.Map;

/**
 * The API's responses by outcome, from zero. The HTTP server metrics carry route and status, so the first 5xx of a
 * route starts a series whose first count increase() cannot see, and the "Errores 5xx" alert would miss that
 * burst; these counters exist from startup.
 */
@Startup
@ApplicationScoped
public class ApiResponses {

    private final Map<Family, Counter> counters = new EnumMap<>(Family.class);

    ApiResponses(MeterRegistry meters) {
        for (Family family : Family.values()) {
            Counter counter = Counter.builder("cetus.api.responses")
                    .tag("outcome", family.name().toLowerCase(Locale.ROOT))
                    .register(meters);
            // The OpenTelemetry bridge exports a counter only once something is added.
            counter.increment(0);
            counters.put(family, counter);
        }
    }

    void record(int status) {
        counters.get(Family.familyOf(status)).increment();
    }
}
