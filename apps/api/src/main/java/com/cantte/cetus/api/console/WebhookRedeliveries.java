package com.cantte.cetus.api.console;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.WebhookDeliveryEntity;
import com.cantte.cetus.persistence.entity.WebhookEndpointEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * The events a disabled endpoint missed: those whose delivery failed or was canceled while it was failing,
 * and those published while it was disabled, which never got a delivery. Re-enabling it can send them
 * all again, oldest first, with the same event id and body.
 */
@ApplicationScoped
public class WebhookRedeliveries {

    /** At most this many per re-enabling; the rest can still be retried one by one. */
    static final int MAX = 10_000;

    /** The events of the endpoint's account and environment it subscribes to, since the window opened. */
    private static final String MISSED = """
            FROM billing.webhook_events e
            LEFT JOIN billing.webhook_deliveries d ON d.event_id = e.id AND d.endpoint_id = :endpoint
            WHERE e.account_id = :account AND e.environment = :environment AND e.created_at >= :since
              AND (:types = '' OR e.type = ANY (string_to_array(:types, ',')))
              AND (d.id IS NULL OR d.status IN ('FAILED', 'CANCELED'))
            """;

    @Inject
    EntityManager em;
    @Inject
    JobQueue jobs;

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
        return ((Number) parameters(em.createNativeQuery("SELECT count(*) " + MISSED), endpoint, since)
                .getSingleResult()).longValue();
    }

    /** Queues them again; call it before the endpoint's window is cleared. */
    @Transactional(Transactional.TxType.MANDATORY)
    @SuppressWarnings("unchecked")
    public int redeliver(WebhookEndpointEntity endpoint) {
        OffsetDateTime since = windowStart(endpoint);
        if (since == null) {
            return 0;
        }
        List<Object[]> missed = parameters(em.createNativeQuery(
                "SELECT e.id, d.id " + MISSED + " ORDER BY e.created_at, e.id LIMIT " + MAX, Object[].class),
                endpoint, since).getResultList();
        for (Object[] row : missed) {
            WebhookDeliveryEntity delivery;
            if (row[1] == null) {
                delivery = new WebhookDeliveryEntity();
                delivery.id = Ids.newId();
                delivery.eventId = (UUID) row[0];
                delivery.endpointId = endpoint.id;
                delivery.persist();
            } else {
                delivery = WebhookDeliveryEntity.findById(row[1]);
                delivery.status = WebhookDeliveryEntity.Status.PENDING;
                delivery.lastError = null;
            }
            jobs.enqueue(JobTypes.DELIVER_WEBHOOK, delivery.id);
        }
        return missed.size();
    }

    private static Query parameters(Query query, WebhookEndpointEntity endpoint,
                                    OffsetDateTime since) {
        return query.setParameter("endpoint", endpoint.id)
                .setParameter("account", endpoint.accountId)
                .setParameter("environment", endpoint.environment.name())
                .setParameter("since", since)
                .setParameter("types", String.join(",", endpoint.eventTypes == null ? new String[0] : endpoint.eventTypes));
    }
}
