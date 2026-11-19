package com.cantte.cetus.worker.batches;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentBatchEntity;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * CHECK_OPEN_BATCHES: closes the batches whose documents all reached a final status but whose closing check was lost,
 * and measures the open batches and those that stopped moving. Safe on many replicas: closing holds a Postgres
 * advisory lock, and a replica that does not get it only measures.
 */
@ApplicationScoped
public class BatchUpkeep {

    private static final Logger LOG = Logger.getLogger(BatchUpkeep.class);
    /** Advisory lock id shared by every replica ("cetusbch" in ASCII). */
    private static final long LOCK_ID = 0x6365747573_626368L;

    private final Map<Environment, AtomicLong> open = new EnumMap<>(Environment.class);
    private final Map<Environment, AtomicLong> stuck = new EnumMap<>(Environment.class);

    @Inject
    EntityManager em;

    @Inject
    BatchClosure closure;

    @ConfigProperty(name = "cetus.batches.stuck-after", defaultValue = "PT1H")
    Duration stuckAfter;

    BatchUpkeep(MeterRegistry meters) {
        for (Environment environment : Environment.values()) {
            open.put(environment, gauge(meters, environment, "open"));
            stuck.put(environment, gauge(meters, environment, "stuck"));
        }
    }

    private static AtomicLong gauge(MeterRegistry meters, Environment environment, String outcome) {
        AtomicLong value = new AtomicLong();
        Gauge.builder("cetus.batches.open", value, AtomicLong::get)
                .tag("environment", environment.name())
                .tag("outcome", outcome)
                .register(meters);
        return value;
    }

    @Scheduled(
            every = "${cetus.batches.check-interval}",
            delayed = "1m",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduled() {
        check();
    }

    /** @return the batches it closed */
    @Transactional
    public List<UUID> check() {
        measure();
        if (!Boolean.TRUE.equals(em.createNativeQuery("SELECT pg_try_advisory_xact_lock(:id)")
                .setParameter("id", LOCK_ID)
                .getSingleResult())) {
            return List.of();
        }
        List<UUID> closed = DocumentBatchEntity.listOpen().stream()
                .filter(batch -> batch.status == DocumentBatchEntity.Status.PROCESSING)
                .map(batch -> DocumentBatchEntity.lock(batch.id).orElseThrow())
                .filter(closure::closeIfDone)
                .map(batch -> batch.id)
                .toList();
        if (!closed.isEmpty()) {
            LOG.warnf("Closed %d batches whose closing check was lost: %s", closed.size(), closed);
        }
        return closed;
    }

    /**
     * Open batches by environment, and among them the stuck ones: neither the batch nor any of its documents changed
     * in {@link #stuckAfter}.
     */
    private void measure() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT b.environment, count(*),
                               count(*) FILTER (WHERE greatest(b.updated_at,
                                   (SELECT max(d.updated_at) FROM billing.documents d WHERE d.batch_id = b.id)) < :since)
                        FROM billing.document_batches b
                        WHERE b.status IN ('RECEIVED', 'EXPANDING', 'PROCESSING')
                        GROUP BY b.environment
                        """)
                .setParameter("since", OffsetDateTime.now().minus(stuckAfter))
                .getResultList();
        open.values().forEach(value -> value.set(0));
        stuck.values().forEach(value -> value.set(0));
        for (Object[] row : rows) {
            Environment environment = Environment.valueOf((String) row[0]);
            open.get(environment).set(((Number) row[1]).longValue());
            stuck.get(environment).set(((Number) row[2]).longValue());
        }
        long stuckTotal = stuck.values().stream().mapToLong(AtomicLong::get).sum();
        if (stuckTotal > 0) {
            LOG.warnf("%d batches have not moved in %s", stuckTotal, stuckAfter);
        }
    }
}
