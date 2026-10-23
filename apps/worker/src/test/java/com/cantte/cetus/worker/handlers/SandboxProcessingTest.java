package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.dian.DianTransportException;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.persistence.entity.DianSubmissionEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity.Kind;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.worker.support.FakeDian;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.FakeDocumentStorage;
import com.cantte.cetus.worker.support.FakeResend;
import com.cantte.cetus.worker.support.FakeResendResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** SANDBOX documents go through the whole pipeline, answered by the simulator and never by the DIAN. */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
@QuarkusTestResource(FakeResendResource.class)
class SandboxProcessingTest {

    @Inject
    ProcessDocumentHandler handler;
    @Inject
    DeliverDocumentHandler delivery;
    @Inject
    FakeDian dian;
    @Inject
    FakeResend resend;
    @Inject
    WorkerFixtures fixtures;
    @Inject
    DocumentStorage storage;

    @BeforeEach
    void reset() {
        dian.reset();
        resend.reset();
    }

    @AfterEach
    void neverReachesTheDian() {
        assertThat(dian.operations()).isEmpty();
    }

    @Test
    void anyOtherCustomerIsAcceptedAndItsFilesStayDeletable() {
        UUID id = fixtures.sandboxInvoice("900108281");

        process(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(doc.cufe).hasSize(96);
        assertThat(doc.dianStatusCode).isEqualTo("00");
        assertThat(doc.dianStatusMessage).isEqualTo("Procesado Correctamente.");
        assertThat(artifacts(id)).extracting(a -> a.kind).containsExactlyInAnyOrder(
                Kind.SIGNED_XML, Kind.ZIP, Kind.DIAN_RESPONSE, Kind.APPLICATION_RESPONSE);
        assertThat(artifacts(id)).noneSatisfy(a -> assertThat(((FakeDocumentStorage) storage).isRetained(a.s3Key)).isTrue());
        assertThat(artifacts(id)).allSatisfy(a -> assertThat(a.s3Key).startsWith("documents/sandbox/"));
        assertThat(new String(storage.get(artifact(id, Kind.DIAN_RESPONSE).s3Key), StandardCharsets.UTF_8))
                .contains("La Factura electrónica SIM-" + doc.number + ", ha sido autorizada.");
        // The XML is built like a habilitación one, with the sandbox Software ID.
        String xml = new String(storage.get(artifact(id, Kind.SIGNED_XML).s3Key), StandardCharsets.UTF_8);
        assertThat(xml).contains("<cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>",
                "5a4db0c0-0000-4000-8000-000000000001");
    }

    @Test
    void twoAccountsIssuingTheSameInvoiceInTheSameSecondGetDifferentCufes() {
        // Every sample issuer shares its NIT and numbering, and these two invoices match in every field.
        UUID first = fixtures.sandboxInvoice("900108281");
        UUID second = fixtures.sandboxInvoice("900108281");
        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity copy = DocumentEntity.findById(second);
            copy.number = DocumentEntity.<DocumentEntity>findById(first).number;
        });

        process(first);
        process(second);

        assertThat(document(first).status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(document(second).status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(document(second).cufe).isNotEqualTo(document(first).cufe);
    }

    @Test
    void rejectedWithTheRulesOfARealRejection() {
        UUID id = fixtures.sandboxInvoice("1000000002");

        process(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.REJECTED);
        assertThat(doc.dianStatusCode).isEqualTo("99");
        assertThat(doc.dianErrors).anySatisfy(error -> assertThat(error).startsWith("Regla: FAK26, Rechazo:"));
    }

    @Test
    void aTimeoutIsResolvedByTheStatusOnTheNextAttempt() {
        UUID id = fixtures.sandboxInvoice("1000000003");

        DianTransportException timeout = catchThrowableOfType(DianTransportException.class, () -> process(id));
        assertThat(timeout.isTimeout()).isTrue();
        process(id);

        assertThat(document(id).status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(submissions(id)).containsExactly("SendBillSync", "GetStatus");
    }

    @Test
    void aTemporaryFailureIsRetriedUntilItClears() {
        UUID id = fixtures.sandboxInvoice("1000000004");

        for (int attempt = 0; attempt < 2; attempt++) {
            DianFaultException fault = catchThrowableOfType(DianFaultException.class, () -> process(id));
            assertThat(fault.retryable()).isTrue();
            assertThat(document(id).status).isEqualTo(DocumentStatus.FAILED);
        }
        process(id);

        assertThat(document(id).status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(submissions(id)).containsExactly(
                "SendBillSync", "GetStatus", "SendBillSync", "GetStatus", "SendBillSync");
    }

    @Test
    void aCreditNoteIsRejectedForItsCorrection() {
        UUID invoiceId = fixtures.sandboxInvoice("1000000005");
        UUID id = fixtures.creditNote(invoiceId);

        process(id);

        DocumentEntity note = document(id);
        assertThat(note.status).isEqualTo(DocumentStatus.REJECTED);
        assertThat(note.dianErrors).singleElement().asString().startsWith("Regla: CBF04, Rechazo:");
    }

    @Test
    void withoutATechnicalContactNothingIsEmailed() {
        UUID id = fixtures.sandboxInvoice("900108281");
        process(id);

        delivery.handle(fixtures.job(id, 1));

        assertThat(artifacts(id)).extracting(a -> a.kind).contains(Kind.ATTACHED_DOCUMENT, Kind.PDF);
        DocumentDeliveryEntity skipped = deliveries(id).getFirst();
        assertThat(skipped.status).isEqualTo(DocumentDeliveryEntity.Status.SKIPPED);
        assertThat(skipped.error).contains("technical contact");
        assertThat(resend.requests()).isEmpty();
    }

    @Test
    void theTechnicalContactGetsTheEmailInsteadOfTheCustomerAFewTimesADay() {
        // The test profile allows two SANDBOX emails a day per account.
        UUID first = fixtures.sandboxInvoice("900108281");
        UUID accountId = document(first).accountId;
        fixtures.contacts(accountId, "dev@cliente.test", "fiscal@cliente.test", null);
        List<UUID> invoices = List.of(first, fixtures.sandboxInvoiceFor(accountId), fixtures.sandboxInvoiceFor(accountId));

        for (UUID id : invoices) {
            process(id);
            delivery.handle(fixtures.job(id, 1));
        }

        assertThat(resend.requests()).hasSize(2).allSatisfy(request -> {
            assertThat(request.body().get("to").get(0).asText()).isEqualTo("dev@cliente.test");
            assertThat(request.body().get("subject").asText()).startsWith("[Simulación] ");
            assertThat(request.body().get("text").asText()).contains("no fue enviado a la DIAN");
        });
        DocumentDeliveryEntity third = deliveries(invoices.get(2)).getFirst();
        assertThat(third.status).isEqualTo(DocumentDeliveryEntity.Status.SKIPPED);
        assertThat(third.error).contains("2 SANDBOX emails of the day");
    }

    private static List<DocumentDeliveryEntity> deliveries(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentDeliveryEntity.listByDocument(id));
    }

    private void process(UUID documentId) {
        handler.handle(fixtures.job(documentId, 1));
    }

    private static DocumentEntity document(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentEntity.findById(id));
    }

    private static List<DocumentArtifactEntity> artifacts(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentArtifactEntity.listByDocument(id));
    }

    private static DocumentArtifactEntity artifact(UUID id, Kind kind) {
        return artifacts(id).stream().filter(a -> a.kind == kind).findFirst().orElseThrow();
    }

    private static List<String> submissions(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DianSubmissionEntity.<DianSubmissionEntity>list(
                "documentId = ?1 order by createdAt", id).stream().map(s -> s.operation).toList());
    }
}
