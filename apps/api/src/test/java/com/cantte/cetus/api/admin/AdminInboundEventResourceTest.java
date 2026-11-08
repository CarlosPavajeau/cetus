package com.cantte.cetus.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity.Provider;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity.Status;
import com.cantte.cetus.persistence.entity.JobEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** A provider event the worker gave up on goes back to the queue once; any other stays as it is. */
@QuarkusTest
class AdminInboundEventResourceTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);
    private static final ConsoleUser SUPPORT = ConsoleUser.platformStaff(PlatformRoles.SUPPORT);

    @Test
    void aFailedEventIsQueuedAgainOnce() {
        UUID id = event(Status.FAILED);

        SUPPORT.request().get("/admin/inbound-events").then().statusCode(200).body("id", hasItem(id.toString()));
        SUPPORT.request()
                .post("/admin/inbound-events/" + id + "/requeue")
                .then()
                .statusCode(403);
        ADMIN.request()
                .post("/admin/inbound-events/" + id + "/requeue")
                .then()
                .statusCode(200)
                .body("status", equalTo("RECEIVED"));
        ADMIN.request()
                .post("/admin/inbound-events/" + id + "/requeue")
                .then()
                .statusCode(422)
                .body("code", equalTo("event_not_failed"));

        InboundWebhookEventEntity event =
                QuarkusTransaction.requiringNew().call(() -> InboundWebhookEventEntity.findById(id));
        assertThat(event.error).isNull();
        assertThat(event.processedAt).isNull();
        assertThat(event.generation).isEqualTo(1);
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() -> JobEntity.count(
                                "jobType = ?1 and referenceId = ?2", JobTypes.PROCESS_WEBHOOK_EVENT, id)))
                .isEqualTo(1);
    }

    @Test
    void aProcessedEventIsNotQueuedAgain() {
        UUID id = event(Status.PROCESSED);

        ADMIN.request()
                .post("/admin/inbound-events/" + id + "/requeue")
                .then()
                .statusCode(422)
                .body("code", equalTo("event_not_failed"));
        ADMIN.request()
                .post("/admin/inbound-events/" + UUID.randomUUID() + "/requeue")
                .then()
                .statusCode(404);
    }

    private static UUID event(Status status) {
        return QuarkusTransaction.requiringNew().call(() -> {
            UUID id = InboundWebhookEventEntity.record(
                            Provider.RESEND, "msg_" + UUID.randomUUID(), "email.delivered", "{}")
                    .orElseThrow();
            InboundWebhookEventEntity.update(
                    "status = ?1, error = ?2 where id = ?3", status, status == Status.FAILED ? "Gave up" : null, id);
            return id;
        });
    }
}
