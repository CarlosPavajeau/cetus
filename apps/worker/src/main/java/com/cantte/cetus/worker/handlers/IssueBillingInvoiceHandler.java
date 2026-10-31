package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.billing.BillingInvoices;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.UUID;

/** Issues Cetus' own invoice for a paid order. Enqueued by {@code OrderInvoice}. */
@ApplicationScoped
public class IssueBillingInvoiceHandler implements JobHandler {

    private static final Duration UNCONFIGURED_DELAY = Duration.ofMinutes(30);

    @Inject
    BillingInvoices invoices;

    @Override
    public String type() {
        return JobTypes.ISSUE_BILLING_INVOICE;
    }

    @Override
    public void handle(JobEntity job) {
        UUID issuerId = invoices.issuerId()
                .orElseThrow(() -> new RetryLater(UNCONFIGURED_DELAY, "The billing issuer is not configured"));
        try {
            invoices.issue(job.referenceId, issuerId);
        } catch (BillingInvoices.UnsupportedTaxRate e) {
            throw new GiveUp(e.getMessage(), e);
        }
    }
}
