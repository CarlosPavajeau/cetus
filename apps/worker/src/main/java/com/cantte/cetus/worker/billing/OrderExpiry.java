package com.cantte.cetus.worker.billing;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

/**
 * Marks EXPIRED the orders still unpaid at their expires_at, when the checkout stops taking their payment. A
 * payment approved later (a slow PSE) still pays an expired order. One idempotent statement: replicas running
 * it at once do not get in each other's way.
 */
@ApplicationScoped
public class OrderExpiry {

    private static final Logger LOG = Logger.getLogger(OrderExpiry.class);

    @Inject
    EntityManager em;

    @Scheduled(
            every = "${cetus.billing.order-expiry-interval}",
            delayed = "1m",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduled() {
        run();
    }

    /** @return how many orders expired */
    @Transactional
    public int run() {
        int expired = em.createNativeQuery("""
                        UPDATE billing.billing_orders SET status = 'EXPIRED', updated_at = now()
                        WHERE status = 'PENDING' AND expires_at < now()
                        """).executeUpdate();
        if (expired > 0) {
            LOG.infof("%d unpaid orders expired", expired);
        }
        return expired;
    }
}
