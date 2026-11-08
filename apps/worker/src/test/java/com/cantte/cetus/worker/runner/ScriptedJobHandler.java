package com.cantte.cetus.worker.runner;

import com.cantte.cetus.persistence.entity.JobEntity;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/** A job type whose runs do what each test scripts for their reference, so the runner is tested on its own. */
@ApplicationScoped
public class ScriptedJobHandler implements JobHandler {

    static final String TYPE = "TEST_SCRIPTED";

    @FunctionalInterface
    interface Step {
        void run(JobEntity job) throws Exception;
    }

    private final Map<UUID, Step> scripts = new ConcurrentHashMap<>();
    private final Map<UUID, AtomicInteger> runs = new ConcurrentHashMap<>();
    private final Map<UUID, AtomicInteger> deaths = new ConcurrentHashMap<>();

    void script(UUID referenceId, Step step) {
        scripts.put(referenceId, step);
    }

    int runs(UUID referenceId) {
        return runs.getOrDefault(referenceId, new AtomicInteger()).get();
    }

    int deaths(UUID referenceId) {
        return deaths.getOrDefault(referenceId, new AtomicInteger()).get();
    }

    @Override
    public String type() {
        return TYPE;
    }

    @Override
    public void handle(JobEntity job) throws Exception {
        runs.computeIfAbsent(job.referenceId, id -> new AtomicInteger()).incrementAndGet();
        Step step = scripts.get(job.referenceId);
        if (step != null) {
            step.run(job);
        }
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        deaths.computeIfAbsent(job.referenceId, id -> new AtomicInteger()).incrementAndGet();
    }
}
