package com.cantte.cetus.worker.runner;

import java.time.Duration;

/** The job is fine but must run again later (e.g. the DIAN is still processing). */
public class RetryLater extends RuntimeException {

    private final Duration delay;

    public RetryLater(Duration delay, String reason) {
        super(reason);
        this.delay = delay;
    }

    public Duration delay() {
        return delay;
    }
}
