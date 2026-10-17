package com.cantte.cetus.worker.runner;

import com.cantte.cetus.persistence.entity.JobEntity;

public interface JobHandler {

    String type();

    /**
     * Throw {@link RetryLater} to re-run without counting a failure, {@link GiveUp} to mark the job dead
     * right away; any other exception retries with backoff.
     */
    void handle(JobEntity job) throws Exception;
}
