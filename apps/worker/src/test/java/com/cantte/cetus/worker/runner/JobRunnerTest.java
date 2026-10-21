package com.cantte.cetus.worker.runner;

import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.support.FakeDian;
import com.cantte.cetus.worker.support.FakeDian.Reply;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.BooleanSupplier;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
class JobRunnerTest {

    @Inject
    JobRunner runner;
    @Inject
    FakeDian dian;
    @Inject
    WorkerFixtures fixtures;

    @BeforeEach
    void reset() {
        dian.reset();
    }

    @Test
    void aFailedAttemptIsRetriedAndTheDocumentKeepsProcessing() {
        dian.reply("SendBillSync", Reply.dropConnection());
        UUID id = fixtures.invoice();
        JobEntity job = fixtures.job(id, 1);

        runner.run(job);

        assertThat(job(job.id).status).isEqualTo("PENDING");
        assertThat(document(id).status).isEqualTo(DocumentStatus.PROCESSING);
    }

    @Test
    void aDeadJobLeavesTheDocumentFailed() {
        dian.reply("SendBillSync", Reply.dropConnection());
        UUID id = fixtures.invoice();
        JobEntity job = fixtures.job(id, 10);

        runner.run(job);

        assertThat(job(job.id).status).isEqualTo("DEAD");
        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.FAILED);
        assertThat(doc.dianStatusMessage).startsWith("Gave up after 10 attempts: DianTransportException");
    }

    @Test
    void runsSeveralJobsAtOnce() {
        // Six answers of 700 ms take 4.2 s one after the other; overlapped, about one.
        Reply slow = Reply.fixture("send-bill-sync-accepted.xml");
        List<UUID> documents = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            dian.reply("SendBillSync", new Reply(slow.status(), slow.body(), Duration.ofMillis(700), false));
            UUID id = fixtures.invoice();
            fixtures.pendingJob(id);
            documents.add(id);
        }
        long started = System.nanoTime();

        runner.wake();

        await(() -> documents.stream().allMatch(id -> document(id).status == DocumentStatus.ACCEPTED));
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofMillis(2500));
        await(runner::idle);
    }

    /** Polls until the condition holds, for at most 10 s. */
    static void await(BooleanSupplier condition) {
        long deadline = System.nanoTime() + Duration.ofSeconds(10).toNanos();
        while (!condition.getAsBoolean()) {
            assertThat(System.nanoTime()).as("condition still false after 10 s").isLessThan(deadline);
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(e);
            }
        }
    }

    private static JobEntity job(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> JobEntity.findById(id));
    }

    static DocumentEntity document(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentEntity.findById(id));
    }
}
