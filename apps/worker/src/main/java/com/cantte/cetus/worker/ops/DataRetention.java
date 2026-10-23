package com.cantte.cetus.worker.ops;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Deletes what is only kept for a while, once a day while traffic is low:
 * <ul>
 *     <li>API key requests older than {@code cetus.retention.api-key-requests} (one row per /v1 request; the
 *     console shows the last 24 hours);</li>
 *     <li>expired idempotency keys (24 hours after their request);</li>
 *     <li>DONE jobs older than {@code cetus.retention.done-jobs}. DEAD jobs stay: they are few, a document's
 *     timeline shows them and the ops alerts are about them.</li>
 *     <li>notices older than {@code cetus.retention.notifications}, except those whose dedup key still
 *     holds back a repeat: a range at 80 % or 95 % stays there while it is active, so its notice stays too.
 *     The other keys name something that does not come back (an expiry already past, a day, a moment).</li>
 * </ul>
 * In batches of {@code cetus.retention.batch-size}, each in its own short transaction, so a large backlog
 * never holds locks or writes a huge transaction. Two replicas running it at once only share the work.
 */
@ApplicationScoped
public class DataRetention {

    private static final Logger LOG = Logger.getLogger(DataRetention.class);
    /**
     * The shortest retention of the notices: a certificate or a resolution keeps requesting its 30-day notice
     * every day until it reaches the 7-day mark, so a shorter one would send that notice again.
     */
    static final Duration MIN_NOTIFICATIONS = Duration.ofDays(
            Math.max(AccountHealthChecks.CERTIFICATE_DAYS.get(0), AccountHealthChecks.RESOLUTION_DAYS.get(0)) + 1);

    @Inject
    EntityManager em;

    @ConfigProperty(name = "cetus.retention.api-key-requests")
    Duration apiKeyRequests;
    @ConfigProperty(name = "cetus.retention.done-jobs")
    Duration doneJobs;
    @ConfigProperty(name = "cetus.retention.notifications")
    Duration notifications;
    @ConfigProperty(name = "cetus.retention.batch-size")
    int batchSize;

    @Scheduled(cron = "${cetus.retention.cron}", timeZone = "America/Bogota",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduled() {
        run();
    }

    /** Deletes everything past its retention; returns how many rows of each table. */
    public Map<String, Long> run() {
        return run(notifications);
    }

    /** {@link #run()} with another retention for the notices (tests). */
    Map<String, Long> run(Duration notifications) {
        OffsetDateTime now = OffsetDateTime.now();
        Map<String, Long> deleted = new LinkedHashMap<>();
        deleted.put("api_key_requests", deleteInBatches("api_key_requests", "created_at < :before",
                now.minus(apiKeyRequests)));
        deleted.put("idempotency_keys", deleteInBatches("idempotency_keys", "expires_at < :before", now));
        deleted.put("jobs", deleteInBatches("jobs", "status = 'DONE' AND updated_at < :before", now.minus(doneJobs)));
        // The range id is cast only for range notices (CASE keeps the cast from other keys), and compared as
        // a uuid so the lookup uses the primary key.
        deleted.put("notification_log", deleteInBatches("notification_log", """
                created_at < :before AND NOT (kind = 'RANGE_RUNNING_OUT' AND EXISTS (
                    SELECT 1 FROM billing.numbering_ranges r
                    WHERE r.id = CASE WHEN kind = 'RANGE_RUNNING_OUT'
                                      THEN CAST(split_part(dedup_key, ':', 2) AS uuid) END
                      AND r.status = 'ACTIVE'))
                """, now.minus(atLeastTheMinimum(notifications))));
        LOG.infof("Data retention deleted %s", deleted);
        return deleted;
    }

    private static Duration atLeastTheMinimum(Duration notifications) {
        if (notifications.compareTo(MIN_NOTIFICATIONS) < 0) {
            LOG.warnf("cetus.retention.notifications=%s is shorter than %s, which notices need so they are not "
                    + "sent again; using %s", notifications, MIN_NOTIFICATIONS, MIN_NOTIFICATIONS);
            return MIN_NOTIFICATIONS;
        }
        return notifications;
    }

    private long deleteInBatches(String table, String condition, OffsetDateTime before) {
        // ctid: the row's physical address, so each batch deletes exactly the rows its subquery found.
        String sql = "DELETE FROM billing." + table + " WHERE ctid IN (SELECT ctid FROM billing." + table
                + " WHERE " + condition + " LIMIT :limit)";
        long total = 0;
        int batch;
        do {
            batch = QuarkusTransaction.requiringNew().call(() -> em.createNativeQuery(sql)
                    .setParameter("before", before)
                    .setParameter("limit", batchSize)
                    .executeUpdate());
            total += batch;
        } while (batch == batchSize);
        return total;
    }
}
