package com.cantte.cetus.api.auth;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class ApiKeyRateLimiterTest {

    private final AtomicLong now = new AtomicLong();
    private final ApiKeyRateLimiter limiter = new ApiKeyRateLimiter(2, 3, now::get);

    @Test
    void allowsTheBurstThenAsksToWaitForTheNextToken() {
        UUID key = UUID.randomUUID();
        for (int i = 0; i < 3; i++) {
            assertThat(limiter.acquire(key)).isEmpty();
        }
        assertThat(limiter.acquire(key)).contains(Duration.ofMillis(500));

        now.addAndGet(Duration.ofMillis(500).toNanos());
        assertThat(limiter.acquire(key)).isEmpty();
        assertThat(limiter.acquire(key)).isPresent();
    }

    @Test
    void refillsUpToTheBurstOnly() {
        UUID key = UUID.randomUUID();
        limiter.acquire(key);
        now.addAndGet(Duration.ofHours(1).toNanos());

        for (int i = 0; i < 3; i++) {
            assertThat(limiter.acquire(key)).isEmpty();
        }
        assertThat(limiter.acquire(key)).isPresent();
    }

    @Test
    void eachKeyHasItsOwnBucket() {
        UUID busy = UUID.randomUUID();
        for (int i = 0; i < 3; i++) {
            limiter.acquire(busy);
        }
        assertThat(limiter.acquire(busy)).isPresent();
        assertThat(limiter.acquire(UUID.randomUUID())).isEmpty();
    }
}
