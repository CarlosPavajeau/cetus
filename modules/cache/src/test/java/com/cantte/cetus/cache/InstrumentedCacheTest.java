package com.cantte.cetus.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class InstrumentedCacheTest {

    @Test
    void countsHitsMissesAndLoadErrorsPerCache() {
        var meters = new SimpleMeterRegistry();
        var caches = new LocalCaches(meters);
        Cache<String, String> cache = caches.shared("accounts", 8, Duration.ofMinutes(1), String.class);

        cache.get("a", () -> "first");
        cache.get("a", () -> "unexpected");
        cache.find("missing", Optional::empty);
        assertThatThrownBy(() -> cache.get("b", () -> {
                    throw new IllegalStateException("Database unavailable");
                }))
                .isInstanceOf(IllegalStateException.class);

        assertThat(count(meters, "hit")).isEqualTo(1);
        assertThat(count(meters, "miss")).isEqualTo(2);
        assertThat(count(meters, "load_error")).isEqualTo(1);
        assertThat(meters.get("cetus.cache.size")
                        .tag("cache.name", "accounts")
                        .gauge()
                        .value())
                .isEqualTo(1);
    }

    private static double count(SimpleMeterRegistry meters, String outcome) {
        return meters.get("cetus.cache.requests")
                .tag("cache.name", "accounts")
                .tag("outcome", outcome)
                .counter()
                .count();
    }
}
