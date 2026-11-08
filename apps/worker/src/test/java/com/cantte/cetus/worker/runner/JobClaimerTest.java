package com.cantte.cetus.worker.runner;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.jobs.JobClaimer;
import com.cantte.cetus.persistence.entity.JobEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class JobClaimerTest {

    @Inject
    JobClaimer claimer;

    @Test
    void claimsUpToEachTypesLimitAndTheTotal() {
        // Types of their own, so jobs other tests left behind are not claimed here.
        String a = "TEST_A_" + Ids.newId();
        String b = "TEST_B_" + Ids.newId();
        String ignored = "TEST_C_" + Ids.newId();
        for (int i = 0; i < 5; i++) {
            pending(a, 60 - i);
            pending(b, 30 - i);
            pending(ignored, 90 - i);
        }

        List<JobEntity> claimed =
                claimer.claim("worker-test", Map.of(a, 2, b, 5, "UNUSED", 0), 4, Duration.ofMinutes(5));

        assertThat(claimed).extracting(job -> job.jobType).containsExactlyInAnyOrder(a, a, b, b);
        assertThat(claimed).allMatch(job -> "RUNNING".equals(job.status) && "worker-test".equals(job.lockedBy));
        assertThat(claimer.claim("worker-test", Map.of(a, 5), 10, Duration.ofMinutes(5)))
                .hasSize(3);
        assertThat(claimer.claim("worker-test", Map.of(), 10, Duration.ofMinutes(5)))
                .isEmpty();
    }

    @Test
    void aRunWhoseLeaseExpiredCannotWriteOverTheNextClaim() {
        String type = "TEST_D_" + Ids.newId();
        pending(type, 1);
        JobEntity first =
                claimer.claim("worker-a", Map.of(type, 1), 1, Duration.ZERO).getFirst();
        JobEntity second = claimer.claim("worker-b", Map.of(type, 1), 1, Duration.ofMinutes(5))
                .getFirst();

        assertThat(second.id).isEqualTo(first.id);
        assertThat(second.claimId).isNotEqualTo(first.claimId);
        assertThat(claimer.done(first)).isFalse();
        assertThat(claimer.reschedule(first, Duration.ofMinutes(1))).isFalse();
        assertThat(claimer.extend(first, Duration.ofMinutes(5))).isFalse();
        assertThat(claimer.kill(first, "late")).isFalse();
        assertThat(stored(first.id).status).isEqualTo("RUNNING");

        assertThat(claimer.done(second)).isTrue();
        assertThat(claimer.fail(first, "late")).isEqualTo(JobClaimer.Failure.LOST);
        assertThat(stored(first.id).status).isEqualTo("DONE");
    }

    @Test
    void aFailureCountsTheAttemptsOfTheRow() {
        String type = "TEST_E_" + Ids.newId();
        pending(type, 1);
        JobEntity job = claimer.claim("worker-a", Map.of(type, 1), 1, Duration.ofMinutes(5))
                .getFirst();
        job.maxAttempts = 99;
        QuarkusTransaction.requiringNew().run(() -> JobEntity.update("maxAttempts = 1 where id = ?1", job.id));

        assertThat(claimer.fail(job, "boom")).isEqualTo(JobClaimer.Failure.DEAD);
        assertThat(stored(job.id).status).isEqualTo("DEAD");
    }

    private static JobEntity stored(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> JobEntity.findById(id));
    }

    private static void pending(String type, int secondsAgo) {
        QuarkusTransaction.requiringNew().run(() -> {
            JobEntity job = new JobEntity();
            job.id = Ids.newId();
            job.jobType = type;
            job.runAt = OffsetDateTime.now().minusSeconds(secondsAgo);
            job.updatedAt = OffsetDateTime.now();
            job.persist();
        });
    }
}
