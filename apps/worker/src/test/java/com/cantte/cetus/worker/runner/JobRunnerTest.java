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

import java.util.UUID;

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

    private static JobEntity job(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> JobEntity.findById(id));
    }

    private static DocumentEntity document(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentEntity.findById(id));
    }
}
