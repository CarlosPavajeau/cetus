package com.cantte.cetus.worker.batches;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentBatchEntity;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
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
 * and measures the open batches and those that stopped moving. Each batch is closed in its own short transaction under
 * its lock, so replicas running it at once agree and the documents finishing meanwhile wait for one batch at most.
 */
@ApplicationScoped
public class BatchUpkeep {

    private static final Logger LOG = Logger.getLogger(BatchUpkeep.class);

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
            open.put(environment, gauge(meters, "cetus.batches.open", environment));
            stuck.put(environment, gauge(meters, "cetus.batches.stuck", environment));
        }
    }

    private static AtomicLong gauge(MeterRegistry meters, String name, Environment environment) {
        AtomicLong value = new AtomicLong();
        Gauge.builder(name, value, AtomicLong::get)
                .tag("environment", environment.name())
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
    public List<UUID> check() {
        QuarkusTransaction.requiringNew().run(this::measure);
        List<UUID> closed = QuarkusTransaction.requiringNew().call(BatchUpkeep::closable).stream()
                .filter(id -> QuarkusTransaction.requiringNew()
                        .call(() -> DocumentBatchEntity.lock(id)
                                .map(closure::closeIfDone)
                                .orElse(false)))
                .toList();
        if (!closed.isEmpty()) {
            LOG.warnf("Closed %d batches whose closing check was lost: %s", closed.size(), closed);
        }
        return closed;
    }

    /** Batches whose expansion ended and whose documents all have a final status. */
    private static List<UUID> closable() {
        return DocumentBatchEntity.<DocumentBatchEntity>list("status", DocumentBatchEntity.Status.PROCESSING).stream()
                .filter(batch -> !DocumentBatchEntity.hasUnfinishedDocuments(batch.id))
                .map(batch -> batch.id)
                .toList();
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
                        WHERE b.status IN (:open)
                        GROUP BY b.environment
                        """)
                .setParameter("since", OffsetDateTime.now().minus(stuckAfter))
                .setParameter(
                        "open",
                        DocumentBatchEntity.Status.OPEN.stream().map(Enum::name).toList())
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
