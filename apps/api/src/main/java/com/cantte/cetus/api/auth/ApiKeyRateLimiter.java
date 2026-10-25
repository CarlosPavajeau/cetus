package com.cantte.cetus.api.auth;

import com.cantte.cetus.domain.model.Environment;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * A token bucket per API key: {@code burst} requests at once, refilled at {@code requests-per-second}.
 * SANDBOX keys have their own, lower limits: the sandbox is free to use, so it is the easiest to abuse.
 * Production keys of an account whose plan limits its requests share one bucket per account instead, since
 * the plan sells them per account: a minute's worth at once, refilled over the minute.
 * The buckets live in memory, so with several API replicas each one allows that much.
 */
@ApplicationScoped
public class ApiKeyRateLimiter {

    /** Requests a key may make at once ({@code burst}) and the rate its bucket refills at. */
    public record Limits(double ratePerSecond, int burst) {}

    private final Limits limits;
    private final Limits sandboxLimits;
    private final LongSupplier nanoClock;
    private final Map<UUID, Bucket> buckets = new ConcurrentHashMap<>();

    @Inject
    public ApiKeyRateLimiter(
            @ConfigProperty(name = "cetus.rate-limit.requests-per-second") double ratePerSecond,
            @ConfigProperty(name = "cetus.rate-limit.burst") int burst,
            @ConfigProperty(name = "cetus.rate-limit.sandbox.requests-per-second") double sandboxRate,
            @ConfigProperty(name = "cetus.rate-limit.sandbox.burst") int sandboxBurst) {
        this(new Limits(ratePerSecond, burst), new Limits(sandboxRate, sandboxBurst), System::nanoTime);
    }

    ApiKeyRateLimiter(Limits limits, Limits sandboxLimits, LongSupplier nanoClock) {
        this.limits = limits;
        this.sandboxLimits = sandboxLimits;
        this.nanoClock = nanoClock;
    }

    /**
     * Takes one token; when there is none, returns how long until the next one.
     *
     * @param planRequestsPerMinute the account plan's production requests a minute; null when it has no limit
     */
    public Optional<Duration> acquire(
            UUID apiKeyId, UUID accountId, Environment environment, Integer planRequestsPerMinute) {
        if (environment == Environment.LIVE && planRequestsPerMinute != null) {
            return bucket(accountId, new Limits(planRequestsPerMinute / 60.0, planRequestsPerMinute))
                    .take();
        }
        return bucket(apiKeyId, environment == Environment.SANDBOX ? sandboxLimits : limits)
                .take();
    }

    /** A plan change gives the account a new bucket with the new limits. */
    private Bucket bucket(UUID id, Limits bucketLimits) {
        return buckets.compute(
                id,
                (key, bucket) -> bucket != null && bucket.limits.equals(bucketLimits)
                        ? bucket
                        : new Bucket(bucketLimits, nanoClock.getAsLong()));
    }

    private final class Bucket {

        private final Limits limits;
        private final double ratePerSecond;
        private final double burst;
        private double tokens;
        private long refilledAt;

        Bucket(Limits limits, long now) {
            this.limits = limits;
            this.ratePerSecond = limits.ratePerSecond();
            this.burst = limits.burst();
            this.tokens = limits.burst();
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
