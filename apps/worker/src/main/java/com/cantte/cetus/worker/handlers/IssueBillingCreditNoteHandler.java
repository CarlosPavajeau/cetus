package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.billing.BillingCreditNotes;
import com.cantte.cetus.worker.billing.BillingInvoices;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;

/** Issues the credit note of an approved reversal over Cetus' own invoice. Enqueued by {@code BillingCreditNotes}. */
@ApplicationScoped
public class IssueBillingCreditNoteHandler implements JobHandler {

    private static final Duration INVOICE_PENDING_DELAY = Duration.ofMinutes(30);

    @Inject
    BillingCreditNotes creditNotes;

    @Override
    public String type() {
        return JobTypes.ISSUE_BILLING_CREDIT_NOTE;
    }

    @Override
    public void handle(JobEntity job) {
        BillingCreditNotes.Outcome outcome;
        try {
            outcome = creditNotes.issue(job.referenceId);
        } catch (BillingInvoices.UnsupportedTaxRate e) {
            throw new GiveUp(e.getMessage(), e);
        }
        if (outcome == BillingCreditNotes.Outcome.INVOICE_PENDING) {
            throw new RetryLater(INVOICE_PENDING_DELAY, "The order's invoice is not accepted yet");
        }
    }
}
