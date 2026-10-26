package com.cantte.cetus.jobs;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.entity.JobEntity;
import io.opentelemetry.context.Context;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Enqueues jobs in the caller's transaction (transactional outbox), carrying the current trace. */
@ApplicationScoped
public class JobQueue {

    @Transactional(Transactional.TxType.MANDATORY)
    public UUID enqueue(String type, UUID referenceId) {
        return enqueue(type, referenceId, Duration.ZERO);
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public UUID enqueue(String type, UUID referenceId, Duration delay) {
        JobEntity job = new JobEntity();
        job.id = Ids.newId();
        job.jobType = type;
        job.referenceId = referenceId;
        job.runAt = OffsetDateTime.now().plus(delay);
        job.updatedAt = OffsetDateTime.now();
        job.traceContext = JobTraces.traceparent(Context.current());
        job.persist();
        return job.id;
    }
}
