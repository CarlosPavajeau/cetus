package com.cantte.cetus.worker.handlers;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity.Provider;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity.Status;
import com.cantte.cetus.worker.handlers.ProcessWebhookEventHandler.Received;
import com.cantte.cetus.worker.support.FakeDianResource;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** A run that outlived its job never resolves an event an admin queued again, before or after its new job starts. */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
class ProcessWebhookEventGenerationTest {

    @Test
    void anOldRunCannotResolveAnEventQueuedAgainBeforeItsNewJobStarts() {
        UUID id = event();
        Received old = ProcessWebhookEventHandler.start(id).orElseThrow();
        // The old run's job was given up, and an admin queued the event again (AdminInboundEventResource.requeue).
        QuarkusTransaction.requiringNew()
                .run(() -> InboundWebhookEventEntity.update(
                        "status = ?1, generation = generation + 1 where id = ?2", Status.RECEIVED, id));

        ProcessWebhookEventHandler.finish(id, old.generation(), Status.IGNORED, "No delivery sent the email");

        InboundWebhookEventEntity event = load(id);
        assertThat(event.status).isEqualTo(Status.RECEIVED);
        assertThat(event.error).isNull();

        Received current = ProcessWebhookEventHandler.start(id).orElseThrow();
        ProcessWebhookEventHandler.finish(id, current.generation(), Status.PROCESSED, null);
        assertThat(load(id).status).isEqualTo(Status.PROCESSED);
    }

    private static UUID event() {
        return QuarkusTransaction.requiringNew()
                .call(() -> InboundWebhookEventEntity.record(
                                Provider.RESEND, "msg_" + UUID.randomUUID(), "email.delivered", "{}")
                        .orElseThrow());
    }

    private static InboundWebhookEventEntity load(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> InboundWebhookEventEntity.findById(id));
    }
}
