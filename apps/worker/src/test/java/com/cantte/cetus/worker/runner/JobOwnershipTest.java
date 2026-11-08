package com.cantte.cetus.worker.runner;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.entity.JobEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;

@QuarkusTest
class JobOwnershipTest {

    @Inject
    JobRunner runner;

    @Inject
    JobContext jobContext;

    @Inject
    ScriptedJobHandler handler;

    @Test
    void theHeartbeatKeepsTheLeaseOfARunSlowerThanIt() {
        JobEntity job = running(1, Duration.ofSeconds(1), Duration.ZERO);
        AtomicBoolean leased = new AtomicBoolean();
        handler.script(job.referenceId, run -> {
            Thread.sleep(Duration.ofMillis(2500));
            leased.set(stored(run.id).lockedUntil.isAfter(OffsetDateTime.now()));
        });

        runner.run(job, Duration.ofSeconds(1));

        assertThat(leased).isTrue();
        assertThat(stored(job.id).status).isEqualTo("DONE");
    }

    @Test
    void aRunThatLostItsJobStopsAndWritesNothing() {
        JobEntity job = running(1, Duration.ofMinutes(5), Duration.ZERO);
        AtomicBoolean reachedTheCall = new AtomicBoolean();
        handler.script(job.referenceId, run -> {
            claimedByAnotherRun(run.id);
            // The heartbeat beats every 100 ms and finds the job taken.
            Thread.sleep(Duration.ofMillis(500));
            jobContext.ensureOwned();
            reachedTheCall.set(true);
        });

        runner.run(job, Duration.ofMillis(300));

        assertThat(reachedTheCall).isFalse();
        JobEntity stored = stored(job.id);
        assertThat(stored.status).isEqualTo("RUNNING");
        assertThat(stored.claimId).isNotEqualTo(job.claimId);
        assertThat(handler.deaths(job.referenceId)).isZero();
    }

    @Test
    void aFailureOfALostRunNeitherRetriesNorKillsTheJob() {
        JobEntity job = running(10, Duration.ofMinutes(5), Duration.ZERO);
        handler.script(job.referenceId, run -> {
            claimedByAnotherRun(run.id);
            throw new IllegalStateException("boom");
        });

        runner.run(job);

        assertThat(stored(job.id).status).isEqualTo("RUNNING");
        assertThat(handler.deaths(job.referenceId)).isZero();
    }

    @Test
    void aJobClaimedPastItsLastAttemptDiesWithoutRunning() {
        JobEntity job = running(11, Duration.ofMinutes(5), Duration.ZERO);

        runner.run(job);

        JobEntity stored = stored(job.id);
        assertThat(stored.status).isEqualTo("DEAD");
        assertThat(stored.lastError).contains("last attempt");
        assertThat(handler.runs(job.referenceId)).isZero();
        assertThat(handler.deaths(job.referenceId)).isEqualTo(1);
    }

    @Test
    void aJobStillWaitingPastItsDeadlineGivesUp() {
        JobEntity job = running(1, Duration.ofMinutes(5), Duration.ofHours(2));
        handler.script(job.referenceId, run -> {
            throw new RetryLater(Duration.ofSeconds(15), "still processing");
        });

        runner.run(job);

        JobEntity stored = stored(job.id);
        assertThat(stored.status).isEqualTo("DEAD");
        assertThat(stored.lastError).startsWith("Still waiting after PT1H");
        assertThat(handler.deaths(job.referenceId)).isEqualTo(1);
    }

    @Test
    void aJobWaitingWithinItsDeadlineRunsAgainLater() {
        JobEntity job = running(1, Duration.ofMinutes(5), Duration.ofMinutes(30));
        handler.script(job.referenceId, run -> {
            throw new RetryLater(Duration.ofSeconds(15), "still processing");
        });

        runner.run(job);

        JobEntity stored = stored(job.id);
        assertThat(stored.status).isEqualTo("PENDING");
        assertThat(stored.attempts).isZero();
        assertThat(handler.deaths(job.referenceId)).isZero();
    }

    /** A scripted job as the claimer hands it over, enqueued {@code age} ago. */
    private static JobEntity running(int attempts, Duration lease, Duration age) {
        UUID id = QuarkusTransaction.requiringNew().call(() -> {
            JobEntity job = new JobEntity();
            job.id = Ids.newId();
            job.jobType = ScriptedJobHandler.TYPE;
            job.referenceId = Ids.newId();
            job.status = "RUNNING";
            job.claimId = Ids.newId();
            job.attempts = attempts;
            job.runAt = OffsetDateTime.now();
            job.lockedUntil = job.runAt.plus(lease);
            job.updatedAt = job.runAt;
            job.persist();
            return job.id;
        });
        QuarkusTransaction.requiringNew()
                .run(() -> JobEntity.getEntityManager()
                        .createNativeQuery("UPDATE billing.jobs SET created_at = :at WHERE id = :id")
                        .setParameter("at", OffsetDateTime.now().minus(age))
                        .setParameter("id", id)
                        .executeUpdate());
        return stored(id);
    }

    /** Stamps a new claim on the job, as when its lease expires and another worker claims it. */
    private static void claimedByAnotherRun(UUID jobId) {
        QuarkusTransaction.requiringNew()
                .run(() -> JobEntity.getEntityManager()
                        .createNativeQuery("UPDATE billing.jobs SET claim_id = :claim WHERE id = :id")
                        .setParameter("claim", Ids.newId())
                        .setParameter("id", jobId)
                        .executeUpdate());
    }

    private static JobEntity stored(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> JobEntity.findById(id));
    }
}
