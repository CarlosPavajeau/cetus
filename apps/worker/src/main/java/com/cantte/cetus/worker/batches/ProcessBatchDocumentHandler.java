package com.cantte.cetus.worker.batches;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.handlers.ProcessDocumentHandler;
import com.cantte.cetus.worker.runner.JobHandler;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/** Processes a batch's document like any other, under its own concurrency limit. */
@ApplicationScoped
public class ProcessBatchDocumentHandler implements JobHandler {

    @Inject
    ProcessDocumentHandler documents;

    @Override
    public String type() {
        return JobTypes.PROCESS_BATCH_DOCUMENT;
    }

    @Override
    public void handle(JobEntity job) {
        documents.handle(job);
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        documents.onDead(job, reason);
    }
}
