package com.cantte.cetus.worker.support;

import jakarta.annotation.Priority;
import jakarta.enterprise.inject.Alternative;
import jakarta.inject.Singleton;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

/** The system clock until a test fixes its instants; {@link #reset} goes back to the system clock. */
@Alternative
@Priority(1)
@Singleton
public class TestClock extends Clock {

    private final Deque<Instant> instants = new ArrayDeque<>();

    /** Each read takes the next instant; the last one stays. */
    public synchronized void set(Instant first, Instant... later) {
        instants.clear();
        instants.add(first);
        instants.addAll(List.of(later));
    }

    public synchronized void reset() {
        instants.clear();
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
    public synchronized Instant instant() {
        if (instants.isEmpty()) {
            return Instant.now();
        }
        return instants.size() == 1 ? instants.peek() : instants.poll();
    }
}
