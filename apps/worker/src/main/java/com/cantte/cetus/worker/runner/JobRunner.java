package com.cantte.cetus.worker.runner;

import com.cantte.cetus.jobs.JobClaimer;
import com.cantte.cetus.persistence.entity.JobEntity;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Polls the job table and dispatches each job to its handler. Safe to run on many replicas. */
@ApplicationScoped
public class JobRunner {

    private static final Logger LOG = Logger.getLogger(JobRunner.class);
    private final String workerId = "worker-" + UUID.randomUUID();

    @Inject
    JobClaimer claimer;
    @Inject
    Instance<JobHandler> handlerInstances;

    @ConfigProperty(name = "cetus.jobs.batch-size")
    int batchSize;
    @ConfigProperty(name = "cetus.jobs.lease")
    Duration lease;

    private Map<String, JobHandler> handlers;

    @Scheduled(every = "${cetus.jobs.poll-interval}", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void poll() {
        for (JobEntity job : claimer.claim(workerId, batchSize, lease)) {
            run(job);
        }
    }

    void run(JobEntity job) {
        JobHandler handler = handlers().get(job.jobType);
        if (handler == null) {
            claimer.fail(job, "No handler for job type " + job.jobType);
            return;
        }
        try {
            handler.handle(job);
            claimer.done(job.id);
        } catch (RetryLater retry) {
            claimer.reschedule(job.id, retry.delay());
        } catch (GiveUp giveUp) {
            LOG.errorf("Job %s (%s) failed permanently on attempt %d, not retrying: %s",
                    job.id, job.jobType, job.attempts, giveUp.getMessage());
            claimer.kill(job.id, giveUp.getMessage());
            handler.onDead(job, giveUp.getMessage());
        } catch (Exception e) {
            LOG.warnf(e, "Job %s (%s) failed on attempt %d", job.id, job.jobType, job.attempts);
            String error = e.getClass().getSimpleName() + ": " + e.getMessage();
            if (claimer.fail(job, error)) {
                LOG.errorf("Job %s (%s) is dead after %d attempts", job.id, job.jobType, job.attempts);
                handler.onDead(job, error);
            }
        }
    }

    private Map<String, JobHandler> handlers() {
        if (handlers == null) {
            handlers = handlerInstances.stream().collect(Collectors.toMap(JobHandler::type, Function.identity()));
        }
        return handlers;
    }
}
