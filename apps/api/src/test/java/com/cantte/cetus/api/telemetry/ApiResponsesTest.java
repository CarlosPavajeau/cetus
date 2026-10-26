package com.cantte.cetus.api.telemetry;

import static org.assertj.core.api.Assertions.assertThat;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

class ApiResponsesTest {

    private final SimpleMeterRegistry meters = new SimpleMeterRegistry();
    private final ApiResponses responses = new ApiResponses(meters);

    @Test
    void everyOutcomeStartsAtZero() {
        assertThat(meters.find("cetus.api.responses").counters())
                .hasSize(6)
                .allSatisfy(counter -> assertThat(counter.count()).isZero());
    }

    @Test
    void aResponseCountsUnderItsOutcome() {
        responses.record(503);
        responses.record(202);

        assertThat(count("server_error")).isEqualTo(1);
        assertThat(count("successful")).isEqualTo(1);
        assertThat(count("client_error")).isZero();
    }

    private double count(String outcome) {
        return meters.get("cetus.api.responses")
                .tag("outcome", outcome)
                .counter()
                .count();
    }
}
