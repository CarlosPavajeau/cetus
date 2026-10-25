package com.cantte.cetus.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.model.Environment;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class ApiKeyRateLimiterTest {

    private static final UUID ACCOUNT = UUID.randomUUID();

    private final AtomicLong now = new AtomicLong();
    private final ApiKeyRateLimiter limiter =
            new ApiKeyRateLimiter(new ApiKeyRateLimiter.Limits(2, 3), new ApiKeyRateLimiter.Limits(1, 1), now::get);

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
    void theProductionKeysOfAPlanShareTheAccountsMinute() {
        UUID account = UUID.randomUUID();
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        for (int i = 0; i < 30; i++) {
            assertThat(limiter.acquire(i % 2 == 0 ? first : second, account, Environment.LIVE, 30))
                    .isEmpty();
        }
        assertThat(limiter.acquire(second, account, Environment.LIVE, 30)).contains(Duration.ofSeconds(2));
        // Its test keys keep their own buckets.
        assertThat(limiter.acquire(UUID.randomUUID(), account, Environment.TEST, 30))
                .isEmpty();

        now.addAndGet(Duration.ofSeconds(2).toNanos());
        assertThat(limiter.acquire(first, account, Environment.LIVE, 30)).isEmpty();
    }

    @Test
    void aPlanChangeTakesEffectOnTheNextRequest() {
        UUID account = UUID.randomUUID();
        UUID key = UUID.randomUUID();
        for (int i = 0; i < 30; i++) {
            limiter.acquire(key, account, Environment.LIVE, 30);
        }
        assertThat(limiter.acquire(key, account, Environment.LIVE, 30)).isPresent();

        assertThat(limiter.acquire(key, account, Environment.LIVE, 120)).isEmpty();
    }
}
