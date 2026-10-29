package com.cantte.cetus.cache;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.LongSupplier;

/** Buckets in this process's memory: with several replicas, each one allows the full limit. */
@ApplicationScoped
public class LocalRateLimiter implements RateLimiter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final LongSupplier nanoClock;

    public LocalRateLimiter() {
        this(System::nanoTime);
    }

    public LocalRateLimiter(LongSupplier nanoClock) {
        this.nanoClock = nanoClock;
    }

    @Override
    public Optional<Duration> acquire(String bucket, Limits limits) {
        var wait = new AtomicReference<Optional<Duration>>();
        buckets.compute(bucket, (key, current) -> {
            long now = nanoClock.getAsLong();
            double tokens = current != null && current.limits().equals(limits) ? current.tokensAt(now) : limits.burst();
            if (tokens >= 1) {
                wait.set(Optional.empty());
                return new Bucket(limits, tokens - 1, now);
            }
            wait.set(Optional.of(Duration.ofNanos((long) Math.ceil((1 - tokens) / limits.ratePerSecond() * 1e9))));
            return new Bucket(limits, tokens, now);
        });
        return wait.get();
    }

    /** A bucket that has refilled is the same as none: dropping it keeps the map to the callers still active. */
    @Scheduled(every = "1m")
    void cleanUp() {
        buckets.keySet()
                .forEach(key -> buckets.computeIfPresent(key, (k, bucket) -> {
                    long now = nanoClock.getAsLong();
                    return bucket.tokensAt(now) >= bucket.limits().burst() ? null : bucket;
                }));
    }

    int size() {
        return buckets.size();
    }

    private record Bucket(Limits limits, double tokens, long refilledAt) {

        double tokensAt(long now) {
            return Math.min(limits.burst(), tokens + (now - refilledAt) / 1e9 * limits.ratePerSecond());
        }
    }
}
