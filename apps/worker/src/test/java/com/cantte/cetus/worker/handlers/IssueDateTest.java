package com.cantte.cetus.worker.handlers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.dian.DianTransportException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.dian.Cufe;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.CreditReservationEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity.Kind;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.WebhookEventEntity;
import com.cantte.cetus.signing.XadesSigner;
import com.cantte.cetus.signing.XmlSupport;
import com.cantte.cetus.worker.support.FakeDian;
import com.cantte.cetus.worker.support.FakeDian.Reply;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.TestClock;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

/** The DIAN rejects a document whose issue date is not the day of its signature (FAD09e, CAD09e, DAD09e). */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
class IssueDateTest {

    private static final String CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
    private static final String SEND = "SendBillSync";
    private static final String STATUS = "GetStatus";
    private static final LocalDate CREATED_ON = LocalDate.of(2026, 11, 18);
    private static final LocalTime CREATED_AT = LocalTime.of(23, 59, 59);
    private static final Instant NEXT_DAY = Instant.parse("2026-11-19T05:00:01Z");

    @Inject
    ProcessDocumentHandler handler;

    @Inject
    FakeDian dian;

    @Inject
    WorkerFixtures fixtures;

    @Inject
    DocumentStorage storage;

    @Inject
    TestClock clock;

    @Inject
    CreditLedger ledger;

    @BeforeEach
    void reset() {
        dian.reset();
    }

    @AfterEach
    void resetClock() {
        clock.reset();
    }

    @Test
    void aDocumentSignedTheDayItWasCreatedKeepsItsDate() {
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted.xml"));
        UUID id = fixtures.invoice();
        dated(id, CREATED_ON, LocalTime.of(9, 0));
        clock.set(Instant.parse("2026-11-18T15:00:00Z"));

        process(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(doc.issueDate).isEqualTo(CREATED_ON);
        assertThat(doc.issueTime).isEqualTo(LocalTime.of(9, 0));
        assertThat(doc.cufe).isEqualTo(cufe(doc, "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c"));
    }

    @Test
    void aDocumentSignedTheNextDayTakesTheDayOfItsSignature() {
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted.xml"));
        UUID id = fixtures.invoice();
        dated(id, CREATED_ON, CREATED_AT);
        String cufeOnCreation = cufe(document(id), "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c");
        clock.set(NEXT_DAY);

        process(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(doc.issueDate).isEqualTo(LocalDate.of(2026, 11, 19));
        assertThat(doc.issueTime).isEqualTo(LocalTime.of(0, 0, 1));
        assertThat(doc.cufe)
                .isEqualTo(cufe(doc, "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c"))
                .isNotEqualTo(cufeOnCreation);
        Document xml = signedXml(id);
        assertThat(issueDate(xml)).isEqualTo("2026-11-19");
        assertThat(signingTime(xml)).startsWith("2026-11-19T00:00:01");
    }

    @Test
    void theSimulatorAcceptsADocumentSignedTheNextDay() {
        UUID id = fixtures.sandboxInvoice("222222222222");
        dated(id, CREATED_ON, CREATED_AT);
        clock.set(NEXT_DAY);

        process(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(doc.issueDate).isEqualTo(LocalDate.of(2026, 11, 19));
    }

    @Test
    void notesTakeTheDayOfTheirSignatureToo() {
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted.xml"), Reply.fixture("send-bill-sync-accepted.xml"));
        UUID invoiceId = fixtures.invoice();
        dated(invoiceId, CREATED_ON, LocalTime.of(9, 0));
        UUID creditNote = fixtures.creditNote(invoiceId);
        UUID debitNote = fixtures.debitNote(invoiceId);
        dated(creditNote, CREATED_ON, CREATED_AT);
        dated(debitNote, CREATED_ON, CREATED_AT);
        clock.set(NEXT_DAY);

        process(creditNote);
        process(debitNote);

        for (UUID id : List.of(creditNote, debitNote)) {
            DocumentEntity note = document(id);
            assertThat(note.status).isEqualTo(DocumentStatus.ACCEPTED);
            assertThat(note.issueDate).isEqualTo(LocalDate.of(2026, 11, 19));
            assertThat(note.cufe).isEqualTo(cufe(note, "12345"));
            assertThat(issueDate(signedXml(id))).isEqualTo("2026-11-19");
        }
    }

    @Test
    void aDocumentSignedOnNewYearsDayIsFiledUnderTheNewYear() {
        dian.reply(SEND, Reply.fixture("send-bill-sync-accepted.xml"));
        UUID id = fixtures.invoice();
        dated(id, LocalDate.of(2026, 12, 31), CREATED_AT);
        clock.set(Instant.parse("2027-01-01T05:00:01Z"));

        process(id);

        assertThat(document(id).issueDate).isEqualTo(LocalDate.of(2027, 1, 1));
        assertThat(artifact(id, Kind.SIGNED_XML).s3Key)
                .matches(".*/2027/01/" + id + "/fv090012345600027[0-9a-f]{8}\\.xml");
        assertThat(artifact(id, Kind.ZIP).s3Key).matches(".*/2027/01/" + id + "/z090012345600027[0-9a-f]{8}\\.zip");
    }

    @Test
    void aDocumentTheDianRegisteredBeforeMidnightKeepsItsDate() {
        dian.reply(SEND, Reply.late("send-bill-sync-accepted.xml"));
        dian.reply(STATUS, Reply.fixture("get-status-accepted.xml"));
        UUID id = fixtures.invoice();
        dated(id, CREATED_ON, CREATED_AT);
        clock.set(Instant.parse("2026-11-19T04:59:59Z"));
        catchThrowableOfType(DianTransportException.class, () -> process(id));
        String cufe = document(id).cufe;
        clock.set(NEXT_DAY);

        process(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(doc.issueDate).isEqualTo(CREATED_ON);
        assertThat(doc.cufe).isEqualTo(cufe);
        assertThat(dian.operations()).containsExactly(SEND, STATUS);
    }

    @Test
    void aResolutionThatExpiredBeforeTheSignatureFailsTheDocumentAndGivesBackItsCredit() {
        UUID id = fixtures.invoice();
        dated(id, CREATED_ON, CREATED_AT);
        rangeEndsOn(id, CREATED_ON);
        UUID accountId = live(id);
        grant(accountId);
        QuarkusTransaction.requiringNew()
                .run(() -> ledger.reserve(accountId, id, DocumentType.INVOICE, OffsetDateTime.now()));
        clock.set(NEXT_DAY);

        process(id);

        DocumentEntity doc = document(id);
        assertThat(doc.status).isEqualTo(DocumentStatus.FAILED);
        assertThat(doc.dianStatusMessage).isEqualTo("La resolución de numeración venció antes de firmar el documento");
        assertThat(doc.issueDate).isEqualTo(CREATED_ON);
        assertThat(dian.operations()).isEmpty();
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() -> CreditReservationEntity.listByDocument(id).getFirst().status))
                .isEqualTo(CreditReservationEntity.Status.RELEASED);
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() -> WebhookEventEntity.<WebhookEventEntity>list("documentId", id).stream()
                                .map(event -> event.type)
                                .toList()))
                .containsExactly("invoice.failed");
    }

    private void process(UUID documentId) {
        handler.handle(fixtures.job(documentId, 1));
    }

    private static void dated(UUID id, LocalDate date, LocalTime time) {
        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity doc = DocumentEntity.findById(id);
            doc.issueDate = date;
            doc.issueTime = time;
        });
    }

    private static void rangeEndsOn(UUID id, LocalDate validTo) {
        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity doc = DocumentEntity.findById(id);
            NumberingRangeEntity.<NumberingRangeEntity>findById(doc.numberingRangeId).validTo = validTo;
        });
    }

    private static UUID live(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> {
            DocumentEntity doc = DocumentEntity.findById(id);
            doc.environment = Environment.LIVE;
            return doc.accountId;
        });
    }

    private void grant(UUID accountId) {
        QuarkusTransaction.requiringNew()
                .run(() -> ledger.grant(
                        accountId,
                        new CreditLedger.Source(CreditGrantEntity.SourceType.PROMO, Ids.newId()),
                        PlanVersionEntity.findCurrent(PlanEntity.byCode("EMPRENDEDOR").id, null, OffsetDateTime.now())
                                .orElseThrow()
                                .id,
                        1,
                        OffsetDateTime.now().plusMonths(1),
                        Actor.system(),
                        null));
    }

    private static String cufe(DocumentEntity doc, String key) {
        return Cufe.compute(new Cufe.Input(
                doc.fullNumber(),
                doc.issueDate,
                doc.issueTime,
                WorkerFixtures.calculation(),
                "900123456",
                "900108281",
                key,
                doc.environment));
    }

    private Document signedXml(UUID id) {
        return XmlSupport.parse(storage.get(artifact(id, Kind.SIGNED_XML).s3Key));
    }

    private static String issueDate(Document xml) {
        for (Node node = xml.getDocumentElement().getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node instanceof Element element
                    && CBC.equals(element.getNamespaceURI())
                    && "IssueDate".equals(element.getLocalName())) {
                return element.getTextContent();
            }
        }
        throw new AssertionError("The document has no cbc:IssueDate");
    }

    private static String signingTime(Document xml) {
        return xml.getElementsByTagNameNS(XadesSigner.XADES_NS, "SigningTime")
                .item(0)
                .getTextContent();
    }

    private static DocumentEntity document(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentEntity.findById(id));
    }

    private static DocumentArtifactEntity artifact(UUID id, Kind kind) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentArtifactEntity.listByDocument(id).stream()
                        .filter(a -> a.kind == kind)
                        .reduce((first, second) -> second)
                        .orElseThrow());
    }
}
