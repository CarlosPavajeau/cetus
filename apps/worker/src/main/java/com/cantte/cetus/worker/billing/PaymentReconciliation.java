package com.cantte.cetus.worker.billing;

import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.worker.support.PaymentClients;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Covers the events Wompi never delivers: every few minutes it enqueues a CHECK_PAYMENT for each order still
 * pending after {@code cetus.billing.reconciliation-after}, and for each order that expired less than
 * {@code cetus.billing.reconciliation-expired-for} ago (a PSE payment may be approved after it). An order with a
 * check waiting gets no other. Safe on many replicas: a run holds a Postgres advisory lock.
 */
@ApplicationScoped
public class PaymentReconciliation {

    /** Advisory lock id shared by every replica ("cetuspay" in ASCII). */
    private static final long LOCK_ID = 0x6365747573_706179L;

    @Inject
    EntityManager em;

    @Inject
    JobQueue jobs;

    @Inject
    PaymentClients payments;

    @ConfigProperty(name = "cetus.billing.reconciliation-after")
    Duration after;

    @ConfigProperty(name = "cetus.billing.reconciliation-expired-for")
    Duration expiredFor;

    @Scheduled(
            every = "${cetus.billing.reconciliation-interval}",
            delayed = "2m",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduled() {
        run();
    }

    /** @return the orders whose payments are checked */
    @Transactional
    public List<UUID> run() {
        if (payments.gateway().isEmpty()
                || !Boolean.TRUE.equals(em.createNativeQuery("SELECT pg_try_advisory_xact_lock(:id)")
                        .setParameter("id", LOCK_ID)
                        .getSingleResult())) {
            return List.of();
        }
        OffsetDateTime now = OffsetDateTime.now();
        List<UUID> orders = em.createNativeQuery("""
                        SELECT o.id FROM billing.billing_orders o
                        WHERE ((o.status = 'PENDING' AND o.created_at < :createdBefore)
                               OR (o.status = 'EXPIRED' AND o.expires_at > :expiredAfter))
                          AND NOT EXISTS (SELECT 1 FROM billing.jobs j
                                          WHERE j.reference_id = o.id AND j.job_type = :type
                                            AND j.status IN ('PENDING', 'RUNNING'))
                        """, UUID.class)
                .setParameter("createdBefore", now.minus(after))
                .setParameter("expiredAfter", now.minus(expiredFor))
                .setParameter("type", JobTypes.CHECK_PAYMENT)
                .getResultList();
        orders.forEach(order -> jobs.enqueue(JobTypes.CHECK_PAYMENT, order));
        return orders;
    }
}
