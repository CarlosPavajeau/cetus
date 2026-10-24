package com.cantte.cetus.worker.handlers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.email.EmailTransientException;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity.Kind;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity.Status;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.signing.XmlSupport;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.FakeDian;
import com.cantte.cetus.worker.support.FakeDian.Reply;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.FakeResend;
import com.cantte.cetus.worker.support.FakeResendResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import com.fasterxml.jackson.databind.JsonNode;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

/** Delivery of accepted documents: AttachedDocument and PDF built once, emailed through a fake Resend. */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
@QuarkusTestResource(FakeResendResource.class)
class DeliverDocumentHandlerTest {

    private static final String CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";

    @Inject
    ProcessDocumentHandler processor;

    @Inject
    DeliverDocumentHandler handler;

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

    @Test
    void acceptanceQueuesTheDeliveryAndARejectionDoesNot() {
        UUID accepted = acceptedInvoice();
        dian.reply("SendBillSync", Reply.fixture("send-bill-sync-rejected.xml"));
        UUID rejected = fixtures.invoice();
        processor.handle(fixtures.job(rejected, 1));

        assertThat(jobTypes(accepted)).contains(JobTypes.DELIVER_DOCUMENT);
        assertThat(jobTypes(rejected)).doesNotContain(JobTypes.DELIVER_DOCUMENT);
    }

    @Test
    void emailsTheAttachedDocumentAndThePdfInOneZip() {
        UUID id = acceptedInvoice();
        DocumentEntity doc = document(id);

        deliver(id);

        assertThat(artifactKinds(id)).contains(Kind.ATTACHED_DOCUMENT, Kind.PDF);
        DocumentDeliveryEntity delivery = singleDelivery(id);
        assertThat(delivery.status).isEqualTo(Status.SENT);
        assertThat(delivery.recipient).isEqualTo(FakeResendResource.TEST_RECIPIENT);
        assertThat(delivery.attempts).isEqualTo(1);
        assertThat(delivery.sentAt).isNotNull();

        FakeResend.Request request = resend.requests().getFirst();
        assertThat(request.authorization()).isEqualTo("Bearer " + FakeResendResource.API_KEY);
        assertThat(request.idempotencyKey()).isEqualTo("delivery-" + delivery.id);
        assertThat(delivery.providerMessageId).isEqualTo("email-delivery-" + delivery.id);
        JsonNode body = request.body();
        assertThat(body.get("from").asText()).isEqualTo(FakeResendResource.FROM);
        // TEST documents go to the test mailbox, never to the customer.
        assertThat(body.get("to").get(0).asText()).isEqualTo(FakeResendResource.TEST_RECIPIENT);
        assertThat(body.get("reply_to").get(0).asText()).isEqualTo("facturas@cetus.test");
        assertThat(body.get("subject").asText())
                .isEqualTo("900123456;Cetus Pruebas SAS;" + doc.fullNumber() + ";01;Cetus Pruebas SAS");
        // Sent from an unattended address: the body names the issuer's own contact instead of inviting a reply.
        assertThat(body.get("text").asText())
                .contains("comuníquese con Cetus Pruebas SAS en facturas@cetus.test.")
                .contains("Este es un mensaje automático; por favor no lo responda.")
                .doesNotContain("responda a este correo");
        assertThat(body.get("html").asText()).contains("comuníquese con Cetus Pruebas SAS en facturas@cetus.test.");

        JsonNode attachment = body.get("attachments").get(0);
        assertThat(attachment.get("filename").asText())
                .startsWith("ad0900123456")
                .endsWith(".zip");
        Map<String, byte[]> zip =
                unzip(Base64.getDecoder().decode(attachment.get("content").asText()));
        assertThat(zip.keySet())
                .hasSize(2)
                .anyMatch(name -> name.startsWith("ad0900123456") && name.endsWith(".xml"))
                .contains(doc.fullNumber() + ".pdf");

        byte[] attachedXml = zip.entrySet().stream()
                .filter(e -> e.getKey().endsWith(".xml"))
                .findFirst()
                .orElseThrow()
                .getValue();
        assertThat(attachedXml).isEqualTo(storage.get(artifact(id, Kind.ATTACHED_DOCUMENT).s3Key));
        Document attached = XmlSupport.parse(attachedXml);
        assertThat(attached.getDocumentElement().getLocalName()).isEqualTo("AttachedDocument");
        assertThat(attached.getElementsByTagNameNS("*", "Signature").getLength())
                .isEqualTo(1);
        Element reference = (Element)
                attached.getElementsByTagNameNS("*", "DocumentReference").item(0);
        assertThat(reference.getElementsByTagNameNS("*", "UUID").item(0).getTextContent())
                .isEqualTo(doc.cufe);
        String embedded =
                attached.getElementsByTagNameNS(CBC, "Description").item(0).getTextContent();
        assertThat(embedded.getBytes(StandardCharsets.UTF_8))
                .isEqualTo(storage.get(artifact(id, Kind.SIGNED_XML).s3Key));

        byte[] pdf = zip.get(doc.fullNumber() + ".pdf");
        assertThat(new String(pdf, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
    }

    @Test
    void aRetryReusesTheDeliveryItsKeyAndTheArtifacts() {
        UUID id = acceptedInvoice();
        resend.reply(FakeResend.Reply.error(500, "internal_server_error", "boom"));

        EmailTransientException failure = catchThrowableOfType(EmailTransientException.class, () -> deliver(id));
        assertThat(failure).isNotNull();
        DocumentDeliveryEntity pending = singleDelivery(id);
        assertThat(pending.status).isEqualTo(Status.PENDING);
        assertThat(pending.error).contains("500");

        deliver(id);

        DocumentDeliveryEntity sent = singleDelivery(id);
        assertThat(sent.id).isEqualTo(pending.id);
        assertThat(sent.status).isEqualTo(Status.SENT);
        assertThat(sent.attempts).isEqualTo(2);
        assertThat(sent.error).isNull();
        assertThat(resend.requests())
                .extracting(FakeResend.Request::idempotencyKey)
                .containsExactly("delivery-" + sent.id, "delivery-" + sent.id);
        assertThat(artifactKinds(id).stream().filter(kind -> kind == Kind.ATTACHED_DOCUMENT))
                .hasSize(1);
        assertThat(artifactKinds(id).stream().filter(kind -> kind == Kind.PDF)).hasSize(1);
    }

    @Test
    void aDeliveredDocumentIsNotEmailedAgain() {
        UUID id = acceptedInvoice();
        deliver(id);

        deliver(id);

        assertThat(resend.requests()).hasSize(1);
        assertThat(deliveries(id)).hasSize(1);
    }

    @Test
    void aRateLimitRetriesLaterWithoutFailing() {
        UUID id = acceptedInvoice();
        resend.reply(FakeResend.Reply.error(429, "rate_limit_exceeded", "Too many requests"));

        RetryLater retry = catchThrowableOfType(RetryLater.class, () -> deliver(id));

        assertThat(retry.delay()).isPositive();
        assertThat(singleDelivery(id).status).isEqualTo(Status.PENDING);
    }

    @Test
    void aRejectedEmailFailsTheDeliveryForGood() {
        UUID id = acceptedInvoice();
        resend.reply(FakeResend.Reply.error(422, "validation_error", "Invalid `to` field"));

        GiveUp giveUp = catchThrowableOfType(GiveUp.class, () -> deliver(id));

        assertThat(giveUp).hasMessageContaining("Invalid `to` field");
        DocumentDeliveryEntity delivery = singleDelivery(id);
        assertThat(delivery.status).isEqualTo(Status.FAILED);
        assertThat(delivery.error).contains("validation_error");
    }

    @Test
    void aLiveCustomerWithoutEmailIsSkippedButGetsItsFiles() {
        UUID id = acceptedInvoice();
        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity doc = DocumentEntity.findById(id);
            doc.environment = Environment.LIVE;
            Party c = doc.customer;
            doc.customer = new Party(
                    c.personType(),
                    c.identificationType(),
                    c.identificationNumber(),
                    c.checkDigit(),
                    c.legalName(),
                    c.tradeName(),
                    c.taxLevelCodes(),
                    c.taxSchemeId(),
                    c.taxSchemeName(),
                    c.address(),
                    null,
                    c.phone());
        });

        deliver(id);

        DocumentDeliveryEntity delivery = singleDelivery(id);
        assertThat(delivery.status).isEqualTo(Status.SKIPPED);
        assertThat(delivery.error).isEqualTo("The customer has no email address");
        assertThat(resend.requests()).isEmpty();
        assertThat(artifactKinds(id)).contains(Kind.ATTACHED_DOCUMENT, Kind.PDF);
    }

    @Test
    void aLiveCustomerGetsTheEmailItself() {
        UUID id = acceptedInvoice();
        QuarkusTransaction.requiringNew()
                .run(() -> DocumentEntity.<DocumentEntity>findById(id).environment = Environment.LIVE);

        deliver(id);

        assertThat(resend.requests().getFirst().body().get("to").get(0).asText())
                .isEqualTo("compras@example.com");
    }

    @Test
    void creditNotesAreDeliveredWithTheirCude() {
        dian.reply(
                "SendBillSync",
                Reply.fixture("send-bill-sync-accepted.xml"),
                Reply.fixture("send-bill-sync-accepted.xml"));
        UUID invoiceId = fixtures.invoice();
        processor.handle(fixtures.job(invoiceId, 1));
        UUID id = fixtures.creditNote(invoiceId);
        processor.handle(fixtures.job(id, 1));

        deliver(id);

        DocumentEntity note = document(id);
        assertThat(singleDelivery(id).status).isEqualTo(Status.SENT);
        assertThat(resend.requests().getFirst().body().get("subject").asText())
                .contains(";" + note.fullNumber() + ";91;");
        Document attached = XmlSupport.parse(storage.get(artifact(id, Kind.ATTACHED_DOCUMENT).s3Key));
        Element uuid = (Element) attached.getElementsByTagNameNS("*", "UUID").item(0);
        assertThat(uuid.getAttribute("schemeName")).isEqualTo("CUDE-SHA384");
        assertThat(uuid.getTextContent()).isEqualTo(note.cufe);
    }

    @Test
    void debitNotesAreDeliveredWithTheirCude() {
        dian.reply(
                "SendBillSync",
                Reply.fixture("send-bill-sync-accepted.xml"),
                Reply.fixture("send-bill-sync-accepted.xml"));
        UUID invoiceId = fixtures.invoice();
        processor.handle(fixtures.job(invoiceId, 1));
        UUID id = fixtures.debitNote(invoiceId);
        processor.handle(fixtures.job(id, 1));

        deliver(id);

        DocumentEntity note = document(id);
        assertThat(singleDelivery(id).status).isEqualTo(Status.SENT);
        assertThat(resend.requests().getFirst().body().get("subject").asText())
                .contains(";" + note.fullNumber() + ";92;");
        Document attached = XmlSupport.parse(storage.get(artifact(id, Kind.ATTACHED_DOCUMENT).s3Key));
        Element uuid = (Element) attached.getElementsByTagNameNS("*", "UUID").item(0);
        assertThat(uuid.getAttribute("schemeName")).isEqualTo("CUDE-SHA384");
        assertThat(uuid.getTextContent()).isEqualTo(note.cufe);
        assertThat(storage.get(artifact(id, Kind.ATTACHED_DOCUMENT).s3Key))
                .asString()
                .contains("DebitNote");
    }

    @Test
    void documentsThatAreNotAcceptedAreLeftAlone() {
        UUID id = fixtures.invoice();

        deliver(id);

        assertThat(deliveries(id)).isEmpty();
        assertThat(resend.requests()).isEmpty();
    }

    private UUID acceptedInvoice() {
        dian.reply("SendBillSync", Reply.fixture("send-bill-sync-accepted.xml"));
        UUID id = fixtures.invoice();
        processor.handle(fixtures.job(id, 1));
        return id;
    }

    private void deliver(UUID documentId) {
        handler.handle(fixtures.job(documentId, 1));
    }

    private static DocumentEntity document(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentEntity.findById(id));
    }

    private static List<String> jobTypes(UUID referenceId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> JobEntity.<JobEntity>list("referenceId", referenceId).stream()
                        .map(job -> job.jobType)
                        .toList());
    }

    private static List<Kind> artifactKinds(UUID id) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentArtifactEntity.listByDocument(id).stream()
                        .map(a -> a.kind)
                        .toList());
    }

    private static DocumentArtifactEntity artifact(UUID id, Kind kind) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentArtifactEntity.findLatest(id, kind).orElseThrow());
    }

    private static List<DocumentDeliveryEntity> deliveries(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentDeliveryEntity.listByDocument(id));
    }

    private static DocumentDeliveryEntity singleDelivery(UUID id) {
        List<DocumentDeliveryEntity> deliveries = deliveries(id);
        assertThat(deliveries).hasSize(1);
        return deliveries.getFirst();
    }

    private static Map<String, byte[]> unzip(byte[] zip) {
        Map<String, byte[]> files = new LinkedHashMap<>();
        try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(zip))) {
            for (ZipEntry entry = in.getNextEntry(); entry != null; entry = in.getNextEntry()) {
                files.put(entry.getName(), in.readAllBytes());
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return files;
    }
}
