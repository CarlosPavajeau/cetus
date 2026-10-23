package com.cantte.cetus.api.console;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.WebhookEndpointEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;

/**
 * The events a disabled endpoint missed since its window opened (see {@link #windowStart}):
 * <ul>
 *     <li>deliveries that failed or were canceled since then, whatever the time of their event: the one that
 *     started the streak of failures was published before it;</li>
 *     <li>events published since then that never got a delivery, because the endpoint was disabled.</li>
 * </ul>
 * Re-enabling it can send them all again, with the same event id and body. The deliveries and their jobs are
 * written set-based, so there is no limit: every missed event ends up with a delivery the integrator can
 * follow, and retry one by one if needed.
 */
@ApplicationScoped
public class WebhookRedeliveries {

    /** Failed or canceled deliveries of the endpoint since the window opened. */
    private static final String FAILED = """
            FROM billing.webhook_deliveries d
            WHERE d.endpoint_id = :endpoint AND d.status IN ('FAILED', 'CANCELED') AND d.updated_at >= :since
            """;

    /** Events of the endpoint's account and environment it subscribes to, published since then without a delivery. */
    private static final String UNDELIVERED = """
            FROM billing.webhook_events e
            WHERE e.account_id = :account AND e.environment = :environment AND e.created_at >= :since
              AND (:types = '' OR e.type = ANY (string_to_array(:types, ',')))
              AND NOT EXISTS (SELECT 1 FROM billing.webhook_deliveries d
                              WHERE d.event_id = e.id AND d.endpoint_id = :endpoint)
            """;

    @Inject
    EntityManager em;

    /** Since when the endpoint misses events: the start of its streak of failures, or when it was disabled. */
    static OffsetDateTime windowStart(WebhookEndpointEntity endpoint) {
        return endpoint.failingSince != null ? endpoint.failingSince : endpoint.disabledAt;
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public long count(WebhookEndpointEntity endpoint) {
        OffsetDateTime since = windowStart(endpoint);
        if (since == null) {
            return 0;
        }
        long failed = ((Number) failedParameters(em.createNativeQuery("SELECT count(*) " + FAILED), endpoint, since)
                .getSingleResult()).longValue();
        long undelivered = ((Number) parameters(em.createNativeQuery("SELECT count(*) " + UNDELIVERED), endpoint, since)
                .getSingleResult()).longValue();
        return failed + undelivered;
    }

    /**
     * Queues them again, oldest first; call it with the endpoint locked and before its window is cleared.
     *
     * @return how many deliveries were queued
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public int redeliver(WebhookEndpointEntity endpoint) {
        OffsetDateTime since = windowStart(endpoint);
        if (since == null) {
            return 0;
        }
        // Entities of this transaction must be in the database before the statements below read it.
        em.flush();
        int again = failedParameters(em.createNativeQuery("""
                WITH again AS (
                    UPDATE billing.webhook_deliveries SET status = 'PENDING', last_error = NULL, updated_at = now()
                    WHERE id IN (SELECT d.id %s)
                    RETURNING id, event_id)
                INSERT INTO billing.jobs (id, job_type, reference_id)
                SELECT uuidv7(), :type, again.id
                FROM again JOIN billing.webhook_events e ON e.id = again.event_id
                ORDER BY e.created_at, e.id
                """.formatted(FAILED)), endpoint, since)
                .setParameter("type", JobTypes.DELIVER_WEBHOOK)
                .executeUpdate();
        // uuidv7() is monotonic within the statement, so the new deliveries sort like their events.
        int created = parameters(em.createNativeQuery("""
                WITH created AS (
                    INSERT INTO billing.webhook_deliveries (id, event_id, endpoint_id)
                    SELECT uuidv7(), e.id, :endpoint %s
                    ORDER BY e.created_at, e.id
                    RETURNING id)
                INSERT INTO billing.jobs (id, job_type, reference_id)
                SELECT uuidv7(), :type, created.id FROM created
                """.formatted(UNDELIVERED)), endpoint, since)
                .setParameter("type", JobTypes.DELIVER_WEBHOOK)
                .executeUpdate();
        return again + created;
    }

    private static Query failedParameters(Query query, WebhookEndpointEntity endpoint, OffsetDateTime since) {
        return query.setParameter("endpoint", endpoint.id).setParameter("since", since);
    }

    private static Query parameters(Query query, WebhookEndpointEntity endpoint, OffsetDateTime since) {
        return query.setParameter("endpoint", endpoint.id)
                .setParameter("account", endpoint.accountId)
                .setParameter("environment", endpoint.environment.name())
                .setParameter("since", since)
                .setParameter("types", String.join(",", endpoint.eventTypes == null ? new String[0] : endpoint.eventTypes));
    }
}
