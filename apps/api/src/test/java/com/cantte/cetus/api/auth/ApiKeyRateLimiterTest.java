package com.cantte.cetus.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.cache.LocalRateLimiter;
import com.cantte.cetus.cache.RateLimiter;
import com.cantte.cetus.domain.model.Environment;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class ApiKeyRateLimiterTest {

    private static final UUID ACCOUNT = UUID.randomUUID();
    private static final RateLimiter.Limits INICIAL = new RateLimiter.Limits(5, 20);

    private final AtomicLong now = new AtomicLong();
    private final ApiKeyRateLimiter limiter = new ApiKeyRateLimiter(
            new RateLimiter.Limits(2, 3), new RateLimiter.Limits(1, 1), new LocalRateLimiter(now::get));

    @Test
    void allowsTheBurstThenAsksToWaitForTheNextToken() {
        UUID key = UUID.randomUUID();
        for (int i = 0; i < 3; i++) {
            assertThat(limiter.acquire(key, ACCOUNT, Environment.LIVE, null)).isEmpty();
        }
        assertThat(limiter.acquire(key, ACCOUNT, Environment.LIVE, null)).contains(Duration.ofMillis(500));

        now.addAndGet(Duration.ofMillis(500).toNanos());
        assertThat(limiter.acquire(key, ACCOUNT, Environment.LIVE, null)).isEmpty();
        assertThat(limiter.acquire(key, ACCOUNT, Environment.LIVE, null)).isPresent();
    }

    @Test
    void refillsUpToTheBurstOnly() {
        UUID key = UUID.randomUUID();
        limiter.acquire(key, ACCOUNT, Environment.LIVE, null);
        now.addAndGet(Duration.ofHours(1).toNanos());

        for (int i = 0; i < 3; i++) {
            assertThat(limiter.acquire(key, ACCOUNT, Environment.LIVE, null)).isEmpty();
        }
        assertThat(limiter.acquire(key, ACCOUNT, Environment.LIVE, null)).isPresent();
    }

    @Test
    void eachKeyHasItsOwnBucket() {
        UUID busy = UUID.randomUUID();
        for (int i = 0; i < 3; i++) {
            limiter.acquire(busy, ACCOUNT, Environment.LIVE, null);
        }
        assertThat(limiter.acquire(busy, ACCOUNT, Environment.LIVE, null)).isPresent();
        assertThat(limiter.acquire(UUID.randomUUID(), ACCOUNT, Environment.LIVE, null))
                .isEmpty();
    }

    @Test
    void sandboxKeysHaveTheirOwnLowerLimits() {
        UUID sandbox = UUID.randomUUID();
        assertThat(limiter.acquire(sandbox, ACCOUNT, Environment.SANDBOX, null)).isEmpty();
        assertThat(limiter.acquire(sandbox, ACCOUNT, Environment.SANDBOX, null)).contains(Duration.ofSeconds(1));

        UUID test = UUID.randomUUID();
        for (int i = 0; i < 3; i++) {
            assertThat(limiter.acquire(test, ACCOUNT, Environment.TEST, null)).isEmpty();
        }
    }

    @Test
    void theProductionKeysOfAnAccountShareItsLimits() {
        UUID account = UUID.randomUUID();
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        for (int i = 0; i < 20; i++) {
            assertThat(limiter.acquire(i % 2 == 0 ? first : second, account, Environment.LIVE, INICIAL))
                    .isEmpty();
        }
        assertThat(limiter.acquire(second, account, Environment.LIVE, INICIAL)).contains(Duration.ofMillis(200));
        // Its test keys keep their own buckets.
        assertThat(limiter.acquire(UUID.randomUUID(), account, Environment.TEST, INICIAL))
                .isEmpty();

        now.addAndGet(Duration.ofMillis(200).toNanos());
        assertThat(limiter.acquire(first, account, Environment.LIVE, INICIAL)).isEmpty();
    }

    @Test
    void newLimitsTakeEffectOnTheNextRequest() {
        UUID account = UUID.randomUUID();
        UUID key = UUID.randomUUID();
        for (int i = 0; i < 20; i++) {
            limiter.acquire(key, account, Environment.LIVE, INICIAL);
        }
        assertThat(limiter.acquire(key, account, Environment.LIVE, INICIAL)).isPresent();

        assertThat(limiter.acquire(key, account, Environment.LIVE, new RateLimiter.Limits(10, 40)))
                .isEmpty();
    }
}
