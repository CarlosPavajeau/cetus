package com.cantte.cetus.worker.runner;

import com.cantte.cetus.persistence.entity.JobEntity;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Jobs ready to run and how long the oldest of them has waited, measured every 30 seconds. Every replica
 * reports the same numbers, so dashboards take their max.
 */
@ApplicationScoped
public class QueueMetrics {

    private final AtomicLong depth = new AtomicLong();
    private final AtomicLong oldestAgeSeconds = new AtomicLong();

    QueueMetrics(MeterRegistry meters) {
        Gauge.builder("cetus.jobs.queue.depth", depth, AtomicLong::get).register(meters);
        Gauge.builder("cetus.jobs.queue.oldest_age", oldestAgeSeconds, AtomicLong::get)
                .baseUnit("seconds")
                .register(meters);
    }

    @Scheduled(every = "30s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    @Transactional
    void measure() {
        Object[] ready =
                (Object[]) JobEntity.getEntityManager().createNativeQuery("""
                        SELECT count(*), coalesce(extract(epoch FROM now() - min(run_at)), 0)
                        FROM billing.jobs
                        WHERE status = 'PENDING' AND run_at <= now()
                        """).getSingleResult();
        depth.set(((Number) ready[0]).longValue());
        oldestAgeSeconds.set(((Number) ready[1]).longValue());
    }

    long depth() {
        return depth.get();
    }

    long oldestAgeSeconds() {
        return oldestAgeSeconds.get();
    }
}
