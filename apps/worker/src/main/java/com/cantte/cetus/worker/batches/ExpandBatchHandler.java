package com.cantte.cetus.worker.batches;

import com.cantte.cetus.credits.CreditRefused;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.runner.JobContext;
import com.cantte.cetus.worker.runner.JobHandler;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Creates a batch's documents a block at a time. A run that dies or loses its job leaves every committed block in
 * place; the next run goes on from the first item without a document. The account running out of credits or the
 * issuer out of numbers stops the batch, which closes as PARTIAL.
 */
@ApplicationScoped
public class ExpandBatchHandler implements JobHandler {

    static final String EXPANSION_FAILED = "expansion_failed";

    @Inject
    BatchExpansion expansion;

    @Inject
    JobContext jobContext;

    @Override
    public String type() {
        return JobTypes.EXPAND_BATCH;
    }

    @Override
    public void handle(JobEntity job) {
        if (!expansion.start(job.referenceId)) {
            return;
        }
        while (true) {
            jobContext.ensureOwned();
            int created;
            try {
                created = expansion.block(job.referenceId);
            } catch (CreditRefused e) {
                expansion.stop(job.referenceId, e.reason.code);
                return;
            } catch (DomainException e) {
                expansion.stop(job.referenceId, e.code());
                return;
            }
            if (created == 0) {
                break;
            }
        }
        expansion.finish(job.referenceId);
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        expansion.stop(job.referenceId, EXPANSION_FAILED);
    }
}
