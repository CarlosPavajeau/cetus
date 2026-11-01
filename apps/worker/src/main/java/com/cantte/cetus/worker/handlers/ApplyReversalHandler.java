package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.billing.Reversals;
import com.cantte.cetus.worker.runner.JobHandler;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/** Applies a refund made elsewhere or a chargeback, as registered from the administration. */
@ApplicationScoped
public class ApplyReversalHandler implements JobHandler {

    @Inject
    Reversals reversals;

    @Override
    public String type() {
        return JobTypes.APPLY_REVERSAL;
    }

    @Override
    public void handle(JobEntity job) {
        reversals.apply(job.referenceId);
    }
}
