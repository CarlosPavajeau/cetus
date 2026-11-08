package com.cantte.cetus.worker.runner;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Whether the running job is still this run's. A run loses its job when the heartbeat cannot extend the lease (it
 * expired and another worker claimed the job); handlers ask before a call with effects outside Cetus (the DIAN,
 * Wompi, Resend), so the job does not do it twice.
 */
@ApplicationScoped
public class JobContext {

    static final ScopedValue<AtomicBoolean> LOST = ScopedValue.newInstance();

    /** Throws {@link JobLost} once the run lost its job; does nothing outside a job. */
    public void ensureOwned() {
        if (LOST.isBound() && LOST.get().get()) {
            throw new JobLost();
        }
    }
}
