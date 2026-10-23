package com.cantte.cetus.api.auth;

import com.cantte.cetus.domain.model.Environment;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class ApiKeyRateLimiterTest {

    private final AtomicLong now = new AtomicLong();
    private final ApiKeyRateLimiter limiter = new ApiKeyRateLimiter(new ApiKeyRateLimiter.Limits(2, 3),
            new ApiKeyRateLimiter.Limits(1, 1), now::get);

    @Test
    void allowsTheBurstThenAsksToWaitForTheNextToken() {
        UUID key = UUID.randomUUID();
        for (int i = 0; i < 3; i++) {
            assertThat(limiter.acquire(key, Environment.LIVE)).isEmpty();
        }
        assertThat(limiter.acquire(key, Environment.LIVE)).contains(Duration.ofMillis(500));

        now.addAndGet(Duration.ofMillis(500).toNanos());
        assertThat(limiter.acquire(key, Environment.LIVE)).isEmpty();
        assertThat(limiter.acquire(key, Environment.LIVE)).isPresent();
    }

    @Test
    void refillsUpToTheBurstOnly() {
        UUID key = UUID.randomUUID();
        limiter.acquire(key, Environment.LIVE);
        now.addAndGet(Duration.ofHours(1).toNanos());

        for (int i = 0; i < 3; i++) {
            assertThat(limiter.acquire(key, Environment.LIVE)).isEmpty();
        }
        assertThat(limiter.acquire(key, Environment.LIVE)).isPresent();
    }

    @Test
    void eachKeyHasItsOwnBucket() {
        UUID busy = UUID.randomUUID();
        for (int i = 0; i < 3; i++) {
            limiter.acquire(busy, Environment.LIVE);
        }
        assertThat(limiter.acquire(busy, Environment.LIVE)).isPresent();
        assertThat(limiter.acquire(UUID.randomUUID(), Environment.LIVE)).isEmpty();
    }

    @Test
    void sandboxKeysHaveTheirOwnLowerLimits() {
        UUID sandbox = UUID.randomUUID();
        assertThat(limiter.acquire(sandbox, Environment.SANDBOX)).isEmpty();
        assertThat(limiter.acquire(sandbox, Environment.SANDBOX)).contains(Duration.ofSeconds(1));

        UUID test = UUID.randomUUID();
        for (int i = 0; i < 3; i++) {
            assertThat(limiter.acquire(test, Environment.TEST)).isEmpty();
        }
    }
}
