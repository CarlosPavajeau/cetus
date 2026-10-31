package com.cantte.cetus.worker.billing;

import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * Enqueues the invoice of an order in the transaction that pays it. A sweep enqueues it for the paid orders that never
 * had one, such as those paid before the billing issuer was configured; an order whose invoice job died is left to
 * the ops alert. Safe on many replicas: a sweep holds a Postgres advisory lock.
 */
@ApplicationScoped
public class OrderInvoice {

    private static final Logger LOG = Logger.getLogger(OrderInvoice.class);

    /** Advisory lock id shared by every replica ("cetusinv" in ASCII). */
    private static final long LOCK_ID = 0x63657475_73696e76L;

    @Inject
    BillingInvoices invoices;

    @Inject
    JobQueue jobs;

    @Inject
    EntityManager em;

    void on(@Observes PaymentSettlement.OrderPaid paid) {
        if (invoices.issuerId().isEmpty()) {
            LOG.warnf("Order %s is paid and not invoiced: cetus.billing.invoice-issuer-id is not set", paid.orderId());
            return;
        }
        jobs.enqueue(JobTypes.ISSUE_BILLING_INVOICE, paid.orderId());
    }

    @Scheduled(
            every = "${cetus.billing.invoice-sweep-interval}",
            delayed = "2m",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduled() {
        sweep();
    }

    /** @return the orders whose invoice is enqueued */
    @Transactional
    public List<UUID> sweep() {
        if (invoices.issuerId().isEmpty()
                || !Boolean.TRUE.equals(em.createNativeQuery("SELECT pg_try_advisory_xact_lock(:id)")
                        .setParameter("id", LOCK_ID)
                        .getSingleResult())) {
            return List.of();
        }
        List<UUID> orders = em.createNativeQuery("""
                        SELECT o.id FROM billing.billing_orders o
                        WHERE o.status = 'PAID' AND o.invoice_document_id IS NULL
                          AND NOT EXISTS (SELECT 1 FROM billing.jobs j
                                          WHERE j.reference_id = o.id AND j.job_type = :type)
                        ORDER BY o.paid_at
                        """, UUID.class)
                .setParameter("type", JobTypes.ISSUE_BILLING_INVOICE)
                .getResultList();
        orders.forEach(order -> jobs.enqueue(JobTypes.ISSUE_BILLING_INVOICE, order));
        if (!orders.isEmpty()) {
            LOG.infof("Enqueued the invoices of %d paid orders that had none", orders.size());
        }
        return orders;
    }
}
