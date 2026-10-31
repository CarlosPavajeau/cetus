package com.cantte.cetus.worker.billing;

import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

/** Enqueues the invoice of an order in the transaction that pays it, so a paid order is always invoiced. */
@ApplicationScoped
public class OrderInvoice {

    private static final Logger LOG = Logger.getLogger(OrderInvoice.class);

    @Inject
    BillingInvoices invoices;

    @Inject
    JobQueue jobs;

    void on(@Observes PaymentSettlement.OrderPaid paid) {
        if (invoices.issuerId().isEmpty()) {
            LOG.warnf("Order %s is paid and not invoiced: cetus.billing.invoice-issuer-id is not set", paid.orderId());
            return;
        }
        jobs.enqueue(JobTypes.ISSUE_BILLING_INVOICE, paid.orderId());
    }
}
