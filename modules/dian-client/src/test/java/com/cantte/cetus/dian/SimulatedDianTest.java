package com.cantte.cetus.dian;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.cantte.cetus.dian.simulated.SimulatedDian;
import com.cantte.cetus.dian.simulated.SimulatedDocument;
import com.cantte.cetus.domain.dian.DianRule;
import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.Pkcs12Loader;
import com.cantte.cetus.signing.XadesSigner;
import com.cantte.cetus.signing.XmlSupport;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import javax.xml.crypto.dsig.XMLSignature;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;

/** The simulator's answers read exactly like the DIAN's through the same parser the client uses. */
class SimulatedDianTest {

    private static final String CUFE =
            "6bfc6bd3a183b17ce09b894a08732fbc57dabbd28306118502b76c3e1c8027dcced51fc6aadc4cc27dcb1c910861c222";

    private static SimulatedDian dian;

    @BeforeAll
    static void signer() throws Exception {
        try (var in = SimulatedDianTest.class.getResourceAsStream("/test-signer.p12")) {
            KeyMaterial keys = Pkcs12Loader.load(in.readAllBytes(), "cetus-test".toCharArray());
            dian = new SimulatedDian(keys, Clock.fixed(Instant.parse("2026-10-23T15:00:00Z"), ZoneOffset.UTC));
        }
    }

    @Test
    void readsTheDocumentInsideTheZip() {
        SimulatedDocument document = SimulatedDocument.fromZip(zip("CreditNote", "SIM12", "1000000005"));

        assertThat(document.kind()).isEqualTo(SimulatedDocument.Kind.CREDIT_NOTE);
        assertThat(document.number()).isEqualTo("SIM12");
        assertThat(document.displayNumber()).isEqualTo("SIM-12");
        assertThat(document.uniqueCode()).isEqualTo(CUFE);
        assertThat(document.fileName()).isEqualTo("nc09001234560002600000001");
        assertThat(document.supplierNit()).isEqualTo("900123456");
        assertThat(document.supplierName()).isEqualTo("Acme SAS");
        assertThat(document.customerId()).isEqualTo("1000000005");
    }

    @Test
    void anyOtherCustomerIsAccepted() {
        DianResponse response = dian.sendBillSync(document("Invoice", "222222222222"), 0);

        assertThat(response).isEqualTo(DianResponseParser.single(response.rawXml(), "SendBillSyncResult"));
        assertThat(response.valid()).isTrue();
        assertThat(response.statusCode()).isEqualTo("00");
        assertThat(response.statusMessage()).isEqualTo("La Factura electrónica SIM-1, ha sido autorizada.");
        assertThat(response.errors()).isEmpty();
        assertThat(response.documentKey()).isEqualTo(CUFE);

        Document applicationResponse = XmlSupport.parse(Base64.getDecoder().decode(response.applicationResponse()));
        String xml = new String(Base64.getDecoder().decode(response.applicationResponse()), StandardCharsets.UTF_8);
        assertThat(applicationResponse.getDocumentElement().getLocalName()).isEqualTo("ApplicationResponse");
        assertThat(applicationResponse
                        .getElementsByTagNameNS(XMLSignature.XMLNS, "Signature")
                        .getLength())
                .isEqualTo(1);
        assertThat(xml)
                .contains(
                        "<cbc:ResponseCode>02</cbc:ResponseCode>",
                        "sin validez fiscal",
                        "<cbc:UUID schemeName=\"CUFE-SHA384\">" + CUFE + "</cbc:UUID>");
    }

    @Test
    void acceptsWithANotification() {
        DianResponse response = dian.sendBillSync(document("Invoice", "1000000001"), 0);

        assertThat(response).isEqualTo(DianResponseParser.single(response.rawXml(), "SendBillSyncResult"));
        assertThat(response.valid()).isTrue();
        assertThat(response.errors()).singleElement().asString().startsWith("Regla: FAJ43b, Notificación:");
    }

    @Test
    void rejectsWithTheRulesOfARealRejection() {
        DianResponse response = dian.sendBillSync(document("Invoice", "1000000002"), 0);

        assertThat(response).isEqualTo(DianResponseParser.single(response.rawXml(), "SendBillSyncResult"));
        assertThat(response.valid()).isFalse();
        assertThat(response.statusCode()).isEqualTo("99");
        assertThat(response.errors())
                .extracting(error -> error.substring(0, error.indexOf(',')))
                .containsExactly("Regla: FAK26", "Regla: FAB10a", "Regla: FAJ43b");
        String xml = new String(Base64.getDecoder().decode(response.applicationResponse()), StandardCharsets.UTF_8);
        assertThat(xml)
                .contains("<cbc:ResponseCode>04</cbc:ResponseCode>", "<cbc:ResponseCode>FAK26</cbc:ResponseCode>");
    }

    @Test
    void aTimedOutSendIsFoundByItsStatus() {
        SimulatedDocument document = document("Invoice", "1000000003");

        DianTransportException timeout =
                catchThrowableOfType(DianTransportException.class, () -> dian.sendBillSync(document, 0));
        assertThat(timeout.isTimeout()).isTrue();
        assertThat(dian.getStatus(CUFE, Optional.of(document), 0).statusCode()).isEqualTo("66");

        DianResponse status = dian.getStatus(CUFE, Optional.of(document), 1);
        assertThat(status).isEqualTo(DianResponseParser.single(status.rawXml(), "GetStatusResult"));
        assertThat(status.valid()).isTrue();
    }

    @Test
    void aTemporaryFailureClearsOnTheThirdSend() {
        SimulatedDocument document = document("Invoice", "1000000004");

        for (int previous = 0; previous < 2; previous++) {
            int sends = previous;
            DianFaultException fault =
                    catchThrowableOfType(DianFaultException.class, () -> dian.sendBillSync(document, sends));
            assertThat(fault.retryable()).isTrue();
            DianFaultException parsed = catchThrowableOfType(
                    DianFaultException.class, () -> DianResponseParser.single(fault.rawXml(), "SendBillSyncResult"));
            assertThat(parsed.getMessage()).isEqualTo(fault.getMessage());
            assertThat(dian.getStatus(CUFE, Optional.of(document), sends + 1).statusCode())
                    .as("a fault registers nothing")
                    .isEqualTo("66");
        }
        assertThat(dian.sendBillSync(document, 2).valid()).isTrue();
    }

    @Test
    void onlyCreditNotesAreRejectedForTheirCorrection() {
        DianResponse note = dian.sendBillSync(document("CreditNote", "1000000005"), 0);
        assertThat(note.valid()).isFalse();
        assertThat(note.errors()).singleElement().asString().startsWith("Regla: CBF04, Rechazo:");
        assertThat(note.statusMessage()).isEqualTo("Documento con errores en campos mandatorios.");

        assertThat(dian.sendBillSync(document("DebitNote", "1000000005"), 0).valid())
                .isTrue();
        assertThat(dian.sendBillSync(document("Invoice", "1000000005"), 0).valid())
                .isTrue();
    }

    @Test
    void readsTheIssueDateAndTheDayOfTheSignature() {
        SimulatedDocument document = SimulatedDocument.fromZip(
                zip("Invoice", "SIM1", "222222222222", "2026-10-23", "2026-10-24T00:00:01-05:00"));

        assertThat(document.issueDate()).isEqualTo(LocalDate.of(2026, 10, 23));
        assertThat(document.signingDate()).isEqualTo(LocalDate.of(2026, 10, 24));
    }

    @Test
    void anIssueDateOtherThanTheDayOfTheSignatureIsRejected() {
        assertThat(signedTheNextDay("Invoice").errors())
                .containsExactly("Regla: FAD09e, Rechazo: La fecha de generación de la factura es diferente a la fecha"
                        + " de firma de la factura");
        assertThat(signedTheNextDay("CreditNote").errors())
                .containsExactly("Regla: CAD09e, Rechazo: La fecha de generación de la NC es diferente a la fecha de"
                        + " firma de la NC");
        DianResponse debitNote = signedTheNextDay("DebitNote");
        assertThat(debitNote.valid()).isFalse();
        assertThat(debitNote.statusCode()).isEqualTo("99");
        assertThat(debitNote.errors())
                .containsExactly("Regla: DAD09e, Rechazo: La fecha de generación de la ND es diferente a la fecha de"
                        + " firma de la ND");
        assertThat(DianRule.parse(debitNote.errors().getFirst()))
                .hasValueSatisfying(rule -> assertThat(rule.code()).isEqualTo("DAD09e"));
    }

    @Test
    void anIssueDateOnTheDayOfTheSignatureIsAccepted() {
        DianResponse response = dian.sendBillSync(
                SimulatedDocument.fromZip(
                        zip("Invoice", "SIM1", "222222222222", "2026-10-23", "2026-10-23T23:59:59-05:00")),
                0);

        assertThat(response.valid()).isTrue();
    }

    private static DianResponse signedTheNextDay(String root) {
        return dian.sendBillSync(
                SimulatedDocument.fromZip(zip(root, "SIM1", "222222222222", "2026-10-23", "2026-10-24T00:00:01-05:00")),
                0);
    }

    @Test
    void anUnknownTrackIdIsNotFound() {
        DianResponse status = dian.getStatus("unknown", Optional.empty(), 0);

        assertThat(status).isEqualTo(DianResponseParser.single(status.rawXml(), "GetStatusResult"));
        assertThat(status.statusDescription()).isEqualTo("TrackId no existe en los registros de la DIAN.");
    }

    private static SimulatedDocument document(String root, String customerId) {
        return SimulatedDocument.fromZip(zip(root, "SIM1", customerId));
    }

    private static byte[] zip(String root, String number, String customerId) {
        return zip(root, number, customerId, null, null);
    }

    private static byte[] zip(String root, String number, String customerId, String issueDate, String signingTime) {
        String signature = signingTime == null
                ? ""
                : "<ext:UBLExtensions xmlns:ext=\"urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2\">"
                        + "<ext:UBLExtension><ext:ExtensionContent><xades:SigningTime xmlns:xades=\""
                        + XadesSigner.XADES_NS + "\">" + signingTime + "</xades:SigningTime></ext:ExtensionContent>"
                        + "</ext:UBLExtension></ext:UBLExtensions>";
        String xml = "<" + root + " xmlns=\"urn:oasis:names:specification:ubl:schema:xsd:" + root + "-2\""
                + " xmlns:cac=\"urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2\""
                + " xmlns:cbc=\"urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2\">"
                + signature + "<cbc:ID>" + number + "</cbc:ID>"
                + (issueDate == null ? "" : "<cbc:IssueDate>" + issueDate + "</cbc:IssueDate>")
                + "<cbc:UUID schemeName=\"CUFE-SHA384\">" + CUFE + "</cbc:UUID>"
                + "<cac:AccountingSupplierParty><cac:Party><cac:PartyTaxScheme><cbc:RegistrationName>Acme SAS"
                + "</cbc:RegistrationName><cbc:CompanyID>900123456</cbc:CompanyID></cac:PartyTaxScheme></cac:Party>"
                + "</cac:AccountingSupplierParty><cac:AccountingCustomerParty><cac:Party><cac:PartyTaxScheme>"
                + "<cbc:RegistrationName>Cliente</cbc:RegistrationName><cbc:CompanyID>" + customerId
                + "</cbc:CompanyID></cac:PartyTaxScheme></cac:Party></cac:AccountingCustomerParty></" + root + ">";
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(out)) {
                zip.putNextEntry(new ZipEntry("nc09001234560002600000001.xml"));
                zip.write(xml.getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
