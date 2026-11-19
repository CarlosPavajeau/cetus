package com.cantte.cetus.worker.support;

import jakarta.annotation.Priority;
import jakarta.enterprise.inject.Alternative;
import jakarta.inject.Singleton;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/** The system clock until a test fixes it at an instant; {@link #reset} goes back to the system clock. */
@Alternative
@Priority(1)
@Singleton
public class TestClock extends Clock {

    private volatile Instant fixed;

    public void set(Instant instant) {
        fixed = instant;
    }

    public void reset() {
        fixed = null;
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        TestClock source = this;
        return new Clock() {
            @Override
            public ZoneId getZone() {
                return zone;
            }

            @Override
            public Clock withZone(ZoneId other) {
                return source.withZone(other);
            }

            @Override
            public Instant instant() {
                return source.instant();
            }
        };
    }

    @Override
    public Instant instant() {
        Instant current = fixed;
        return current == null ? Instant.now() : current;
    }
}
