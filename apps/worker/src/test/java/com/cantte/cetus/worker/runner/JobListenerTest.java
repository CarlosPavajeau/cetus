package com.cantte.cetus.worker.runner;

import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.worker.support.FakeDian;
import com.cantte.cetus.worker.support.FakeDian.Reply;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static com.cantte.cetus.worker.runner.JobRunnerTest.await;
import static com.cantte.cetus.worker.runner.JobRunnerTest.document;

@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
@TestProfile(JobListenerTest.Listening.class)
class JobListenerTest {

    /** The scheduler stays off, so only a notification can start the job. */
    public static class Listening implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("cetus.jobs.listen", "true");
        }
    }

    @Inject
    FakeDian dian;
    @Inject
    WorkerFixtures fixtures;
    @Inject
    JobQueue queue;
    @Inject
    JobRunner runner;

    @Test
    void aJobStartsAsSoonAsItIsEnqueued() {
        dian.reset();
        dian.reply("SendBillSync", Reply.fixture("send-bill-sync-accepted.xml"));
        UUID id = fixtures.invoice();

        QuarkusTransaction.requiringNew().run(() -> queue.enqueue(JobTypes.PROCESS_DOCUMENT, id));

        await(() -> document(id).status == DocumentStatus.ACCEPTED);
        await(runner::idle);
    }
}
