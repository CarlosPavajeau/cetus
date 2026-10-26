package com.cantte.cetus.worker.runner;

import com.cantte.cetus.jobs.JobClaimer;
import com.cantte.cetus.jobs.JobTraces;
import com.cantte.cetus.persistence.entity.JobEntity;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import io.quarkus.arc.Arc;
import io.quarkus.arc.ManagedContext;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.scheduler.Scheduled;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import org.jboss.logging.MDC;

/**
 * Claims ready jobs and runs up to {@code cetus.jobs.concurrency} of them at once: most of a job is waiting on
 * the DIAN, S3 or the database, so several overlap their waits on a single CPU. Safe to run on many replicas
 * (the claim skips rows another worker locked).
 *
 * <p>Each type also has its own limit, {@code cetus.jobs.limit.<TYPE>} (default: the total), so one type
 * cannot take every slot: a slow or unreachable DIAN holds at most its documents' slots while emails and
 * webhooks keep going, CPU-heavy deliveries (PDFs) leave room for the documents customers wait for, and no
 * type pushes a provider past its rate limit.
 *
 * <p>Each job runs on a virtual thread of its own. Since Java 24 (JEP 491) one that waits inside a
 * {@code synchronized} block no longer pins its carrier thread, the only one with one vCPU. The semaphores,
 * not the threads, set how many jobs run at once, so raising the limits needs no pool to resize.
 *
 * <p>It claims when woken: by {@link JobListener} as soon as a job is enqueued, when a running job ends (so a
 * backlog drains without waiting), and by the poll, which also picks up delayed jobs, retries and expired
 * leases.
 */
@ApplicationScoped
public class JobRunner {

    private static final Logger LOG = Logger.getLogger(JobRunner.class);
    private static final Duration SHUTDOWN_GRACE = Duration.ofSeconds(30);
    private static final Duration[] DURATION_BUCKETS = {
        Duration.ofMillis(100),
        Duration.ofMillis(500),
        Duration.ofSeconds(1),
        Duration.ofSeconds(5),
        Duration.ofSeconds(30),
        Duration.ofSeconds(60)
    };

    private final String workerId = "worker-" + UUID.randomUUID();
    private final ReentrantLock claiming = new ReentrantLock();
    private final AtomicBoolean wakeRequested = new AtomicBoolean();

    @Inject
    JobClaimer claimer;

    @Inject
    Instance<JobHandler> handlerInstances;

    @Inject
    Config config;

    @Inject
    Tracer tracer;

    @Inject
    MeterRegistry meters;

    @ConfigProperty(name = "cetus.jobs.concurrency")
    int concurrency;

    @ConfigProperty(name = "cetus.jobs.lease")
    Duration lease;

    private Semaphore slots;
    /** Free slots of each job type; only types with a handler are claimed. */
    private final Map<String, Semaphore> typeSlots = new HashMap<>();

    private ExecutorService executor;
    private volatile boolean stopping;
    private Map<String, JobHandler> handlers;

    @PostConstruct
    void init() {
        slots = new Semaphore(concurrency);
        executor = Executors.newThreadPerTaskExecutor(
                Thread.ofVirtual().name("job-", 0).factory());
        handlers = handlerInstances.stream().collect(Collectors.toMap(JobHandler::type, Function.identity()));
        Map<String, Integer> limits = new TreeMap<>();
        for (String type : handlers.keySet()) {
            int limit = Math.min(
                    concurrency,
                    config.getOptionalValue("cetus.jobs.limit." + type, Integer.class)
                            .orElse(concurrency));
            limits.put(type, limit);
            typeSlots.put(type, new Semaphore(limit));
        }
        LOG.infof("Running up to %d jobs at once; per type: %s", concurrency, limits);
    }

    @Scheduled(every = "${cetus.jobs.poll-interval}", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void poll() {
        wake();
    }

    /**
     * Claims as many ready jobs as there are free slots and starts them. Never blocks: when another thread is
     * already claiming, it asks that one to go round once more, so no wake-up is lost.
     */
    public void wake() {
        wakeRequested.set(true);
        while (!stopping && wakeRequested.get() && claiming.tryLock()) {
            try {
                while (!stopping && wakeRequested.getAndSet(false)) {
                    claimAndStart();
                }
            } finally {
                claiming.unlock();
            }
        }
    }

    private void claimAndStart() {
        int free = slots.availablePermits();
        if (free == 0) {
            return;
        }
        Map<String, Integer> wanted = new HashMap<>();
        typeSlots.forEach((type, typeFree) -> wanted.put(type, Math.min(free, typeFree.availablePermits())));
        List<JobEntity> jobs;
        try {
            jobs = claimer.claim(workerId, wanted, free, lease);
        } catch (RuntimeException e) {
            LOG.warnf(e, "Could not claim jobs");
            return;
        }
        for (JobEntity job : jobs) {
            Semaphore typeSlot = typeSlots.get(job.jobType);
            // Only the claiming thread takes permits and running jobs only give them back, so the ones counted
            // before the claim are still there: these never wait.
            slots.acquireUninterruptibly();
            typeSlot.acquireUninterruptibly();
            try {
                executor.execute(() -> {
                    try {
                        runInRequestContext(job);
                    } finally {
                        typeSlot.release();
                        slots.release();
                        wake();
                    }
                });
            } catch (RejectedExecutionException e) {
                // Shutting down: the job stays claimed and runs again when its lease expires.
                typeSlot.release();
                slots.release();
            }
        }
    }

    /**
     * Each job gets its own request context, as the scheduler gave the poll, so it never shares an EntityManager.
     * Its span is a child of the one that enqueued it, so it follows that trace's sampling decision and every
     * attempt shows up in the same trace.
     */
    private void runInRequestContext(JobEntity job) {
        ManagedContext requestContext = Arc.container().requestContext();
        requestContext.activate();
        Span span = tracer.spanBuilder("job.process")
                .setParent(JobTraces.parent(job.traceContext))
                .setSpanKind(SpanKind.CONSUMER)
                .setAttribute("job.type", job.jobType)
                .setAttribute("cetus.job.id", job.id.toString())
                .setAttribute("cetus.reference.id", String.valueOf(job.referenceId))
                .setAttribute("job.attempt", job.attempts)
                .startSpan();
        MDC.put("cetus.job.id", job.id.toString());
        MDC.put("job.type", job.jobType);
        MDC.put("cetus.reference.id", String.valueOf(job.referenceId));
        try (Scope ignored = span.makeCurrent()) {
            run(job);
        } catch (RuntimeException e) {
            // run() already recorded the failure; this is a bug in the bookkeeping, and the lease will retry the job.
            LOG.errorf(e, "Job %s (%s) could not be recorded", job.id, job.jobType);
            span.setStatus(StatusCode.ERROR, e.getClass().getSimpleName());
        } finally {
            MDC.clear();
            span.end();
            requestContext.terminate();
        }
    }

    void run(JobEntity job) {
        long start = System.nanoTime();
        String outcome = "dead";
        JobHandler handler = handlers.get(job.jobType);
        if (handler == null) {
            boolean dead = claimer.fail(job, "No handler for job type " + job.jobType);
            Span.current().setStatus(StatusCode.ERROR, "No handler");
            record(job, dead ? "dead" : "retry", start);
            return;
        }
        try {
            handler.handle(job);
            claimer.done(job.id);
            outcome = "done";
        } catch (RetryLater retry) {
            claimer.reschedule(job.id, retry.delay());
            outcome = "retry";
        } catch (GiveUp giveUp) {
            LOG.errorf(
                    "Job %s (%s) failed permanently on attempt %d, not retrying: %s",
                    job.id, job.jobType, job.attempts, giveUp.getMessage());
            claimer.kill(job.id, giveUp.getMessage());
            Span.current().setStatus(StatusCode.ERROR, "Gave up");
            handler.onDead(job, giveUp.getMessage());
        } catch (Exception e) {
            LOG.warnf(e, "Job %s (%s) failed on attempt %d", job.id, job.jobType, job.attempts);
            String error = e.getClass().getSimpleName() + ": " + e.getMessage();
            // Only the type: messages can carry customer data, and the log above already has them.
            Span.current().setStatus(StatusCode.ERROR, e.getClass().getSimpleName());
            if (claimer.fail(job, error)) {
                LOG.errorf("Job %s (%s) is dead after %d attempts", job.id, job.jobType, job.attempts);
                handler.onDead(job, error);
            } else {
                outcome = "retry";
            }
        } finally {
            record(job, outcome, start);
        }
    }

    private void record(JobEntity job, String outcome, long start) {
        Counter.builder("cetus.jobs.completed")
                .tag("job.type", job.jobType)
                .tag("outcome", outcome)
                .register(meters)
                .increment();
        Timer.builder("cetus.jobs.duration")
                .tag("job.type", job.jobType)
                .serviceLevelObjectives(DURATION_BUCKETS)
                .register(meters)
                .record(Duration.ofNanos(System.nanoTime() - start));
    }

    /** No job running in this worker. */
    boolean idle() {
        return slots.availablePermits() == concurrency;
    }

    /**
     * Stops claiming and gives the running jobs a moment to finish. One still running when the worker stops is
     * claimed again once its lease expires, as after a crash.
     */
    void stop(@Observes ShutdownEvent event) throws InterruptedException {
        stopping = true;
        executor.shutdown();
        if (!executor.awaitTermination(SHUTDOWN_GRACE.toSeconds(), TimeUnit.SECONDS)) {
            LOG.warnf(
                    "%d jobs still running at shutdown; they will be retried when their lease expires",
                    concurrency - slots.availablePermits());
        }
    }
}
