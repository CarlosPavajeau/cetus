package com.cantte.cetus.api.auth;

import com.cantte.cetus.cache.RateLimiter;
import com.cantte.cetus.cache.RateLimiter.Limits;
import com.cantte.cetus.domain.model.Environment;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * A token bucket per API key: {@code burst} requests at once, refilled at {@code requests-per-second}.
 * SANDBOX keys have their own, lower limits: the sandbox is free to use, so it is the easiest to abuse.
 * Production keys of an account with its own limits (its plan's, or set for it) share one bucket per
 * account instead, so more keys do not mean more requests.
 */
@ApplicationScoped
public class ApiKeyRateLimiter {

    private final Limits limits;
    private final Limits sandboxLimits;
    private final RateLimiter buckets;

    @Inject
    public ApiKeyRateLimiter(
            @ConfigProperty(name = "cetus.rate-limit.requests-per-second") double ratePerSecond,
            @ConfigProperty(name = "cetus.rate-limit.burst") int burst,
            @ConfigProperty(name = "cetus.rate-limit.sandbox.requests-per-second") double sandboxRate,
            @ConfigProperty(name = "cetus.rate-limit.sandbox.burst") int sandboxBurst,
            RateLimiter buckets) {
        this(new Limits(ratePerSecond, burst), new Limits(sandboxRate, sandboxBurst), buckets);
    }

    ApiKeyRateLimiter(Limits limits, Limits sandboxLimits, RateLimiter buckets) {
        this.limits = limits;
        this.sandboxLimits = sandboxLimits;
        this.buckets = buckets;
    }

    /** The production limits of a key whose account has none of its own. */
    public Limits perKey() {
        return limits;
    }

    /**
     * Takes one token; when there is none, returns how long until the next one.
     *
     * @param accountLimits the account's production limits; null keeps the per-key ones
     */
    public Optional<Duration> acquire(UUID apiKeyId, UUID accountId, Environment environment, Limits accountLimits) {
        if (environment == Environment.LIVE && accountLimits != null) {
            return buckets.acquire("account:" + accountId, accountLimits);
        }
        return buckets.acquire("key:" + apiKeyId, environment == Environment.SANDBOX ? sandboxLimits : limits);
    }
}
