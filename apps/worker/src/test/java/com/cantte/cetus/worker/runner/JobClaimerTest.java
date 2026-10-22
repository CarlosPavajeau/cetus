package com.cantte.cetus.worker.runner;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.jobs.JobClaimer;
import com.cantte.cetus.persistence.entity.JobEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

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

        List<JobEntity> claimed = claimer.claim("worker-test", Map.of(a, 2, b, 5, "UNUSED", 0), 4, Duration.ofMinutes(5));

        assertThat(claimed).extracting(job -> job.jobType).containsExactlyInAnyOrder(a, a, b, b);
        assertThat(claimed).allMatch(job -> "RUNNING".equals(job.status) && "worker-test".equals(job.lockedBy));
        assertThat(claimer.claim("worker-test", Map.of(a, 5), 10, Duration.ofMinutes(5))).hasSize(3);
        assertThat(claimer.claim("worker-test", Map.of(), 10, Duration.ofMinutes(5))).isEmpty();
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
