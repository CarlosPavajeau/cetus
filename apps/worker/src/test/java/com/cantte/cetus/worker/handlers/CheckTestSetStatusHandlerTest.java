package com.cantte.cetus.worker.handlers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity.Kind;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.FakeDian;
import com.cantte.cetus.worker.support.FakeDian.Reply;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** The GetStatusZip poll of a test set document, against answers synthesised from the DIAN's response shape. */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
class CheckTestSetStatusHandlerTest {

    private static final String STATUS_ZIP = "GetStatusZip";

    @Inject
    CheckTestSetStatusHandler handler;

    @Inject
    FakeDian dian;

    @Inject
    WorkerFixtures fixtures;

    @BeforeEach
    void reset() {
        dian.reset();
    }

    @Test
    void aBatchStillInProcessIsAskedAgainLater() {
        dian.reply(STATUS_ZIP, Reply.fixture("get-status-zip-processing-coded.xml"));
        UUID id = fixtures.invoice();
        submitted(id, "zip-" + UUID.randomUUID());

        RetryLater retry = catchThrowableOfType(RetryLater.class, () -> check(id));

        assertThat(retry).isNotNull();
        assertThat(retry.delay()).isEqualTo(Duration.ofSeconds(15));
        assertThat(document(id).status).isEqualTo(DocumentStatus.SUBMITTED);
        assertThat(artifacts(id)).isEmpty();
        assertThat(dian.operations()).containsExactly(STATUS_ZIP);
    }

    @Test
    void anAnswerWithNoStatusCodeIsAskedAgainLater() {
        dian.reply(STATUS_ZIP, Reply.fixture("get-status-zip-processing.xml"));
        UUID id = fixtures.invoice();
        submitted(id, "zip-" + UUID.randomUUID());

        RetryLater retry = catchThrowableOfType(RetryLater.class, () -> check(id));

        assertThat(retry).isNotNull();
        assertThat(document(id).status).isEqualTo(DocumentStatus.SUBMITTED);
    }

    @Test
    void aTrackIdTheDianDoesNotKnowYetIsAskedAgainLater() {
        dian.reply(STATUS_ZIP, Reply.fixture("get-status-zip-track-id-unknown.xml"));
        UUID id = fixtures.invoice();
        submitted(id, "zip-" + UUID.randomUUID());

        RetryLater retry = catchThrowableOfType(RetryLater.class, () -> check(id));

        assertThat(retry).isNotNull();
        assertThat(document(id).status).isEqualTo(DocumentStatus.SUBMITTED);
        assertThat(artifacts(id)).isEmpty();
    }

    @Test
    void anEmptyListIsAskedAgainLater() {
        dian.reply(STATUS_ZIP, Reply.fixture("get-status-zip-empty.xml"));
        UUID id = fixtures.invoice();
        submitted(id, "zip-" + UUID.randomUUID());

        RetryLater retry = catchThrowableOfType(RetryLater.class, () -> check(id));

        assertThat(retry).isNotNull();
    }

    @Test
    void anAcceptedDocumentStoresTheVerdict() {
        dian.reply(STATUS_ZIP, Reply.fixture("get-status-zip-accepted.xml"));
        UUID id = fixtures.invoice();
        submitted(id, "zip-" + UUID.randomUUID());

        check(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(doc.dianStatusCode).isEqualTo("00");
        assertThat(artifacts(id)).containsExactly(Kind.DIAN_RESPONSE);
    }

    @Test
    void aRejectedDocumentKeepsItsVerdict() {
        dian.reply(
                STATUS_ZIP, Reply.fixture("get-status-zip-rejected.xml"), Reply.fixture("get-status-zip-accepted.xml"));
        UUID id = fixtures.invoice();
        submitted(id, "zip-" + UUID.randomUUID());

        check(id);
        check(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.REJECTED);
        assertThat(doc.dianErrors).anyMatch(error -> error.startsWith("Regla: FAK26"));
        assertThat(dian.operations()).containsExactly(STATUS_ZIP, STATUS_ZIP);
    }

    @Test
    void anAcceptedTestSetIsRecordedOnTheSoftware() {
        String testSetId = "set-" + UUID.randomUUID();
        dian.reply(STATUS_ZIP, testSetAccepted(testSetId));
        UUID id = fixtures.invoice();
        submitted(id, "zip-" + UUID.randomUUID());
        useTestSet(id, testSetId);

        check(id);

        UUID issuerId = document(id).issuerId;
        SoftwareCredentialEntity software = QuarkusTransaction.requiringNew()
                .call(() -> SoftwareCredentialEntity.findActive(issuerId).orElseThrow());
        assertThat(software.testSetAcceptedAt).isNotNull();
    }

    @Test
    void aClientFaultGivesUp() {
        dian.reply(STATUS_ZIP, Reply.fault("fault-client.xml"));
        UUID id = fixtures.invoice();
        submitted(id, "zip-" + UUID.randomUUID());

        GiveUp giveUp = catchThrowableOfType(GiveUp.class, () -> check(id));

        assertThat(giveUp).isNotNull();
        assertThat(giveUp.getMessage()).contains("DIAN fault:");
        assertThat(document(id).status).isEqualTo(DocumentStatus.SUBMITTED);
    }

    @Test
    void aServerFaultIsRetried() {
        dian.reply(STATUS_ZIP, Reply.fault("fault-server.xml"));
        UUID id = fixtures.invoice();
        submitted(id, "zip-" + UUID.randomUUID());

        DianFaultException fault = catchThrowableOfType(DianFaultException.class, () -> check(id));

        assertThat(fault).isNotNull();
        assertThat(fault.retryable()).isTrue();
    }

    @Test
    void aDeadJobFailsTheDocument() {
        UUID id = fixtures.invoice();
        submitted(id, "zip-" + UUID.randomUUID());

        handler.onDead(fixtures.job(id, 10), "boom");

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.FAILED);
        assertThat(doc.dianStatusMessage).startsWith("Gave up checking the test set status: ");
    }

    @Test
    void aDocumentWithNoTrackIdIsLeftAlone() {
        UUID id = fixtures.invoice();

        Throwable thrown = catchThrowable(() -> check(id));

        assertThat(thrown).isNull();
        assertThat(dian.operations()).isEmpty();
    }

    private void check(UUID documentId) {
        handler.handle(fixtures.job(documentId, 1));
    }

    private static Reply testSetAccepted(String testSetId) {
        String body =
                Reply.fixture("get-status-zip-test-set-accepted.xml").body().replace("{TEST_SET_ID}", testSetId);
        return new Reply(200, body, Duration.ZERO, false);
    }

    private static void submitted(UUID documentId, String trackId) {
        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity doc = DocumentEntity.findById(documentId);
            doc.status = DocumentStatus.SUBMITTED;
            doc.dianTrackId = trackId;
        });
    }

    private static void useTestSet(UUID documentId, String testSetId) {
        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity doc = DocumentEntity.findById(documentId);
            SoftwareCredentialEntity software =
                    SoftwareCredentialEntity.findActive(doc.issuerId).orElseThrow();
            software.testSetId = testSetId;
            software.testSetAcceptedAt = null;
        });
    }

    private static DocumentEntity document(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentEntity.findById(id));
    }

    private static List<Kind> artifacts(UUID id) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentArtifactEntity.listByDocument(id).stream()
                        .map(a -> a.kind)
                        .toList());
    }
}
