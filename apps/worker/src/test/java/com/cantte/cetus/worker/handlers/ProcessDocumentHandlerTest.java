package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.dian.DianTransportException;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.persistence.entity.DianSubmissionEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity.Kind;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.worker.runner.GiveUp;
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

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/**
 * The SendBillSync path (production and habilitación outside the test set) against DIAN responses
 * captured in habilitación.
 */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
class ProcessDocumentHandlerTest {

    private static final String SEND = "SendBillSync";
    private static final String STATUS = "GetStatus";

    @Inject
    ProcessDocumentHandler handler;
    @Inject
    FakeDian dian;
    @Inject
    WorkerFixtures fixtures;

    @BeforeEach
    void reset() {
        dian.reset();
    }

    @Test
    void acceptedInvoiceStoresTheResponseAndItsArtifacts() {
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted.xml"));
        UUID id = fixtures.invoice();

        process(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(doc.cufe).hasSize(96);
        assertThat(doc.dianStatusCode).isEqualTo("00");
        assertThat(doc.dianErrors).isEmpty();
        assertThat(doc.validatedAt).isNotNull();
        assertThat(artifacts(id)).containsExactlyInAnyOrder(
                Kind.SIGNED_XML, Kind.ZIP, Kind.DIAN_RESPONSE, Kind.APPLICATION_RESPONSE);
        assertThat(dian.operations()).containsExactly(SEND);
        assertThat(dian.calls().get(0).body()).contains("<wcf:fileName>z0900123456");
    }

    @Test
    void acceptedWithNotificationsKeepsThem() {
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted-with-notifications.xml"));
        UUID id = fixtures.invoice();

        process(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(doc.dianErrors).singleElement().asString().startsWith("Regla: FAJ43b, Notificación");
    }

    @Test
    void rejectedInvoiceIsFinalAndNotRetried() {
        dian.reply(SEND, Reply.fixture("send-bill-sync-rejected.xml"));
        UUID id = fixtures.invoice();

        process(id);
        process(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.REJECTED);
        assertThat(doc.dianStatusCode).isEqualTo("99");
        assertThat(doc.dianErrors).anySatisfy(error -> assertThat(error).startsWith("Regla: FAK26, Rechazo"));
        assertThat(artifacts(id)).contains(Kind.DIAN_RESPONSE, Kind.APPLICATION_RESPONSE);
        assertThat(dian.operations()).containsExactly(SEND);
    }

    @Test
    void serverFaultIsRetriedAfterCheckingTheStatus() {
        dian.reply(SEND, Reply.fault("fault-server.xml"), Reply.fixture("send-bill-sync-accepted.xml"));
        dian.reply(STATUS, Reply.fixture("get-status-not-found.xml"));
        UUID id = fixtures.invoice();

        DianFaultException fault = catchThrowableOfType(DianFaultException.class, () -> process(id));

        assertThat(fault.retryable()).isTrue();
        assertThat(document(id).status).isEqualTo(DocumentStatus.FAILED);
        assertThat(artifacts(id)).contains(Kind.DIAN_RESPONSE);

        process(id);

        assertThat(document(id).status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(dian.operations()).containsExactly(SEND, STATUS, SEND);
    }

    @Test
    void clientFaultGivesUp() {
        dian.reply(SEND, Reply.fault("fault-client.xml"));
        UUID id = fixtures.invoice();

        GiveUp giveUp = catchThrowableOfType(GiveUp.class, () -> process(id));

        assertThat(giveUp).hasMessageContaining("s:Sender");
        assertThat(document(id).status).isEqualTo(DocumentStatus.FAILED);
    }

    @Test
    void afterATimeoutTheStatusIsCheckedInsteadOfSendingAgain() {
        dian.reply(SEND, Reply.late("send-bill-sync-accepted.xml"));
        dian.reply(STATUS, Reply.fixture("get-status-accepted.xml"));
        UUID id = fixtures.invoice();

        DianTransportException timeout = catchThrowableOfType(DianTransportException.class, () -> process(id));

        assertThat(timeout.isTimeout()).isTrue();
        assertThat(submissions(id)).singleElement().satisfies(s -> assertThat(s.timedOut).isTrue());
        assertThat(document(id).status).isEqualTo(DocumentStatus.PROCESSING);

        process(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(artifacts(id)).contains(Kind.APPLICATION_RESPONSE);
        assertThat(dian.operations()).containsExactly(SEND, STATUS);
        assertThat(dian.calls().get(1).body()).contains("<wcf:trackId>" + doc.cufe + "</wcf:trackId>");
    }

    @Test
    void afterATimeoutAnUnknownDocumentIsSentAgain() {
        dian.reply(SEND, Reply.late("send-bill-sync-accepted.xml"), Reply.fixture("send-bill-sync-accepted.xml"));
        dian.reply(STATUS, Reply.fixture("get-status-not-found.xml"));
        UUID id = fixtures.invoice();

        catchThrowableOfType(DianTransportException.class, () -> process(id));
        process(id);

        assertThat(document(id).status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(dian.operations()).containsExactly(SEND, STATUS, SEND);
    }

    @Test
    void afterADroppedConnectionTheStatusIsChecked() {
        dian.reply(SEND, Reply.dropConnection());
        dian.reply(STATUS, Reply.fixture("get-status-accepted.xml"));
        UUID id = fixtures.invoice();

        DianTransportException error = catchThrowableOfType(DianTransportException.class, () -> process(id));
        assertThat(error.isTimeout()).isFalse();

        process(id);

        assertThat(document(id).status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(dian.operations()).containsExactly(SEND, STATUS);
    }

    @Test
    void afterAnHttpErrorTheStatusIsChecked() {
        dian.reply(SEND, Reply.httpError(503));
        dian.reply(STATUS, Reply.fixture("get-status-accepted.xml"));
        UUID id = fixtures.invoice();

        catchThrowableOfType(DianTransportException.class, () -> process(id));
        process(id);

        assertThat(document(id).status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(dian.operations()).containsExactly(SEND, STATUS);
    }

    private void process(UUID documentId) {
        handler.handle(fixtures.job(documentId, 1));
    }

    private static DocumentEntity document(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentEntity.findById(id));
    }

    private static List<Kind> artifacts(UUID id) {
        return QuarkusTransaction.requiringNew().call(() ->
                DocumentArtifactEntity.listByDocument(id).stream().map(a -> a.kind).toList());
    }

    private static List<DianSubmissionEntity> submissions(UUID id) {
        return QuarkusTransaction.requiringNew().call(() ->
                DianSubmissionEntity.<DianSubmissionEntity>list("documentId = ?1 order by createdAt", id));
    }
}
