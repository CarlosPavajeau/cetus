package com.cantte.cetus.lint.telemetry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

class MeterConventionsTest {

    private final SimpleMeterRegistry meters = new SimpleMeterRegistry();

    MeterConventionsTest() {
        meters.config().meterFilter(MeterConventions.attributesFromTheClosedList());
    }

    @Test
    void acceptsAttributesFromTheClosedList() {
        var counter = Counter.builder("cetus.documents")
                .tag("document.type", "INVOICE")
                .tag("outcome", "accepted")
                .register(meters);

        assertThat(counter.getId().getTags()).hasSize(2);
    }

    @Test
    void rejectsAnAttributeOutsideTheClosedList() {
        var builder = Counter.builder("cetus.documents").tag("account.id", "any");

        assertThatThrownBy(() -> builder.register(meters))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("[account.id]");
    }

    @Test
    void leavesLibraryMetersAlone() {
        var counter = Counter.builder("http.server.requests").tag("uri", "/v1").register(meters);

        assertThat(counter.getId().getTag("uri")).isEqualTo("/v1");
    }
}
