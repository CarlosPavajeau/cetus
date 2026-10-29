package com.cantte.cetus.cache;

import java.time.Duration;
import java.util.Optional;

/** Token buckets: {@code burst} requests at once, refilled at {@code ratePerSecond}. */
public interface RateLimiter {

    record Limits(double ratePerSecond, int burst) {}

    /**
     * Takes one token from {@code bucket}; when there is none, returns how long until the next one. A bucket
     * asked with other limits than its own starts over, full, with the new ones.
     */
    Optional<Duration> acquire(String bucket, Limits limits);
}
