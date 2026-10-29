package com.cantte.cetus.cache;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class LocalRateLimiterTest {

    private static final RateLimiter.Limits LIMITS = new RateLimiter.Limits(2, 3);

    private final AtomicLong now = new AtomicLong();
    private final LocalRateLimiter limiter = new LocalRateLimiter(now::get);

    @Test
    void allowsTheBurstThenAsksToWaitForTheNextToken() {
        for (int i = 0; i < 3; i++) {
            assertThat(limiter.acquire("key", LIMITS)).isEmpty();
        }
        assertThat(limiter.acquire("key", LIMITS)).contains(Duration.ofMillis(500));

        now.addAndGet(Duration.ofMillis(500).toNanos());
        assertThat(limiter.acquire("key", LIMITS)).isEmpty();
        assertThat(limiter.acquire("key", LIMITS)).isPresent();
        assertThat(limiter.acquire("other", LIMITS)).isEmpty();
    }

    @Test
    void newLimitsStartTheBucketOverFull() {
        for (int i = 0; i < 3; i++) {
            limiter.acquire("key", LIMITS);
        }
        assertThat(limiter.acquire("key", LIMITS)).isPresent();

        assertThat(limiter.acquire("key", new RateLimiter.Limits(2, 4))).isEmpty();
    }

    @Test
    void theSweepDropsOnlyBucketsThatHaveRefilled() {
        limiter.acquire("idle", LIMITS);
        now.addAndGet(Duration.ofSeconds(1).toNanos());
        for (int i = 0; i < 3; i++) {
            limiter.acquire("busy", LIMITS);
        }

        limiter.cleanUp();

        assertThat(limiter.size()).isEqualTo(1);
        assertThat(limiter.acquire("busy", LIMITS)).isPresent();
        assertThat(limiter.acquire("idle", LIMITS)).isEmpty();
    }
}
