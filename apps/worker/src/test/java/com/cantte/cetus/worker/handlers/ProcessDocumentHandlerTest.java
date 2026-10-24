package com.cantte.cetus.worker.handlers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.dian.DianTransportException;
import com.cantte.cetus.domain.dian.Cufe;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.DianSubmissionEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity.Kind;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import com.cantte.cetus.signing.XmlSupport;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.support.FakeDian;
import com.cantte.cetus.worker.support.FakeDian.Reply;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.FakeDocumentStorage;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

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

    @Inject
    DocumentStorage storage;

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
        assertThat(artifacts(id))
                .containsExactlyInAnyOrder(Kind.SIGNED_XML, Kind.ZIP, Kind.DIAN_RESPONSE, Kind.APPLICATION_RESPONSE);
        assertThat(dian.operations()).containsExactly(SEND);
        assertThat(dian.calls().get(0).body()).contains("<wcf:fileName>z0900123456");
        // Every artifact is written with the legal retention (Object Lock).
        assertThat(QuarkusTransaction.requiringNew().call(() -> DocumentArtifactEntity.listByDocument(id)))
                .allSatisfy(a -> assertThat(((FakeDocumentStorage) storage).isRetained(a.s3Key))
                        .isTrue());
    }

    @Test
    void documentsAlreadyQueuedFinishWhenTheAccountIsSuspended() {
        // They hold their number already: dropping them would leave a gap in the issuer's numbering.
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted.xml"));
        UUID id = fixtures.invoice();
        QuarkusTransaction.requiringNew()
                .run(() -> AccountEntity.<AccountEntity>findById(DocumentEntity.<DocumentEntity>findById(id).accountId)
                        .status = "SUSPENDED");

        process(id);

        assertThat(document(id).status).isEqualTo(DocumentStatus.ACCEPTED);
    }

    @Test
    void aTestSetInProgressReceivesTheDocument() {
        UUID id = fixtures.invoice();
        useTestSet(id, "set-in-progress", null);

        catchThrowable(() -> process(id));

        assertThat(dian.operations()).containsExactly("SendTestSetAsync");
    }

    @Test
    void onceTheDianAcceptedTheTestSetDocumentsGoThroughSendBillSync() {
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted.xml"));
        UUID id = fixtures.invoice();
        useTestSet(id, "set-already-accepted", OffsetDateTime.now().minusDays(1));

        process(id);

        assertThat(document(id).status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(dian.operations()).containsExactly(SEND);
    }

    /** Gives the document's issuer a software with this TestSetId, accepted by the DIAN at {@code acceptedAt}. */
    private static void useTestSet(UUID documentId, String testSetId, OffsetDateTime acceptedAt) {
        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity doc = DocumentEntity.findById(documentId);
            SoftwareCredentialEntity software =
                    SoftwareCredentialEntity.findActive(doc.issuerId).orElseThrow();
            software.testSetId = testSetId;
            software.testSetAcceptedAt = acceptedAt;
        });
    }

    @Test
    void acceptedCreditNoteReferencesItsInvoiceAndUsesACude() {
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted.xml"));
        UUID invoiceId = fixtures.invoice();
        UUID id = fixtures.creditNote(invoiceId);

        process(id);

        DocumentEntity note = document(id);
        DocumentEntity invoice = document(invoiceId);
        assertThat(note.status).isEqualTo(DocumentStatus.ACCEPTED);
        // The CUDE takes the software PIN where the CUFE takes the technical key.
        assertThat(note.cufe)
                .isEqualTo(Cufe.compute(new Cufe.Input(
                        note.fullNumber(),
                        note.issueDate,
                        note.issueTime,
                        WorkerFixtures.calculation(),
                        "900123456",
                        "900108281",
                        "12345",
                        Environment.TEST)));

        DocumentArtifactEntity signed = artifact(id, Kind.SIGNED_XML);
        assertThat(signed.s3Key).contains("/nc0900123456");
        Document xml = XmlSupport.parse(storage.get(signed.s3Key));
        assertThat(xml.getDocumentElement().getLocalName()).isEqualTo("CreditNote");
        Element reference = (Element)
                xml.getElementsByTagNameNS("*", "InvoiceDocumentReference").item(0);
        assertThat(reference.getElementsByTagNameNS("*", "ID").item(0).getTextContent())
                .isEqualTo(invoice.fullNumber());
        assertThat(reference.getElementsByTagNameNS("*", "UUID").item(0).getTextContent())
                .isEqualTo(invoice.cufe);
        assertThat(xml.getElementsByTagNameNS("*", "InvoiceControl").getLength())
                .isZero();
    }

    @Test
    void acceptedDebitNoteReferencesItsInvoiceAndUsesACude() {
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted.xml"));
        UUID invoiceId = fixtures.invoice();
        UUID id = fixtures.debitNote(invoiceId);

        process(id);

        DocumentEntity note = document(id);
        DocumentEntity invoice = document(invoiceId);
        assertThat(note.status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(note.cufe)
                .isEqualTo(Cufe.compute(new Cufe.Input(
                        note.fullNumber(),
                        note.issueDate,
                        note.issueTime,
                        WorkerFixtures.calculation(),
                        "900123456",
                        "900108281",
                        "12345",
                        Environment.TEST)));

        DocumentArtifactEntity signed = artifact(id, Kind.SIGNED_XML);
        assertThat(signed.s3Key).contains("/nd0900123456");
        Document xml = XmlSupport.parse(storage.get(signed.s3Key));
        assertThat(xml.getDocumentElement().getLocalName()).isEqualTo("DebitNote");
        Element discrepancy =
                (Element) xml.getElementsByTagNameNS("*", "DiscrepancyResponse").item(0);
        assertThat(discrepancy
                        .getElementsByTagNameNS("*", "ResponseCode")
                        .item(0)
                        .getTextContent())
                .isEqualTo("1");
        Element reference = (Element)
                xml.getElementsByTagNameNS("*", "InvoiceDocumentReference").item(0);
        assertThat(reference.getElementsByTagNameNS("*", "UUID").item(0).getTextContent())
                .isEqualTo(invoice.cufe);
        assertThat(xml.getElementsByTagNameNS("*", "RequestedMonetaryTotal").getLength())
                .isEqualTo(1);
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
        assertThat(submissions(id))
                .singleElement()
                .satisfies(s -> assertThat(s.timedOut).isTrue());
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
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentArtifactEntity.listByDocument(id).stream()
                        .map(a -> a.kind)
                        .toList());
    }

    private static DocumentArtifactEntity artifact(UUID id, Kind kind) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentArtifactEntity.listByDocument(id).stream()
                        .filter(a -> a.kind == kind)
                        .findFirst()
                        .orElseThrow());
    }

    private static List<DianSubmissionEntity> submissions(UUID id) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DianSubmissionEntity.<DianSubmissionEntity>list("documentId = ?1 order by createdAt", id));
    }
}
