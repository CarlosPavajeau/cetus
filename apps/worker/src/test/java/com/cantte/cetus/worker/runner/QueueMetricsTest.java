package com.cantte.cetus.worker.runner;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
class QueueMetricsTest {

    @Inject
    QueueMetrics metrics;

    @Inject
    WorkerFixtures fixtures;

    @Test
    void aReadyJobCountsAndAges() {
        JobEntity job = fixtures.pendingJob(fixtures.invoice());
        try {
            metrics.measure();
        } finally {
            // Other tests wake the runner, which would claim it.
            QuarkusTransaction.requiringNew().run(() -> JobEntity.deleteById(job.id));
        }

        assertThat(metrics.depth()).isPositive();
        assertThat(metrics.oldestAgeSeconds()).isNotNegative();
    }
}
