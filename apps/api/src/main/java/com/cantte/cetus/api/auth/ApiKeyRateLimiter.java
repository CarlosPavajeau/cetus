package com.cantte.cetus.api.auth;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

/**
 * A token bucket per API key: {@code burst} requests at once, refilled at {@code requests-per-second}.
 * The buckets live in memory, so with several API replicas each one allows that much.
 */
@ApplicationScoped
public class ApiKeyRateLimiter {

    private final double ratePerSecond;
    private final double burst;
    private final LongSupplier nanoClock;
    private final Map<UUID, Bucket> buckets = new ConcurrentHashMap<>();

    @Inject
    public ApiKeyRateLimiter(@ConfigProperty(name = "cetus.rate-limit.requests-per-second") double ratePerSecond,
                             @ConfigProperty(name = "cetus.rate-limit.burst") int burst) {
        this(ratePerSecond, burst, System::nanoTime);
    }

    ApiKeyRateLimiter(double ratePerSecond, int burst, LongSupplier nanoClock) {
        this.ratePerSecond = ratePerSecond;
        this.burst = burst;
        this.nanoClock = nanoClock;
    }

    /** Takes one token; when there is none, returns how long until the next one. */
    public Optional<Duration> acquire(UUID apiKeyId) {
        return buckets.computeIfAbsent(apiKeyId, id -> new Bucket(burst, nanoClock.getAsLong())).take();
    }

    private final class Bucket {

        private double tokens;
        private long refilledAt;

        Bucket(double tokens, long now) {
            this.tokens = tokens;
            this.refilledAt = now;
        }

        synchronized Optional<Duration> take() {
            long now = nanoClock.getAsLong();
            tokens = Math.min(burst, tokens + (now - refilledAt) / 1e9 * ratePerSecond);
            refilledAt = now;
            if (tokens >= 1) {
                tokens--;
                return Optional.empty();
            }
            return Optional.of(Duration.ofNanos((long) Math.ceil((1 - tokens) / ratePerSecond * 1e9)));
        }
    }
}
