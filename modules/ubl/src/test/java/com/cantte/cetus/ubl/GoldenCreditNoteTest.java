package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.dian.Cufe;
import com.cantte.cetus.domain.model.BillingReference;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.ElectronicCreditNote;
import com.cantte.cetus.domain.model.ElectronicInvoice;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.signing.Pkcs12Loader;
import com.cantte.cetus.signing.XadesSigner;
import com.cantte.cetus.signing.XmlSupport;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.time.LocalTime;
import java.util.List;

import static com.cantte.cetus.ubl.GoldenInvoiceTest.parse;
import static com.cantte.cetus.ubl.GoldenInvoiceTest.rootChild;
import static com.cantte.cetus.ubl.GoldenInvoiceTest.skeleton;
import static com.cantte.cetus.ubl.GoldenInvoiceTest.text;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Compares the structure of a freshly built and signed credit note with NC2, the total cancellation
 * of SETP990000006 the DIAN accepted in habilitación without notifications (anonymized in
 * golden/credit-note-habilitacion-accepted.xml). Same approach as {@link GoldenInvoiceTest}.
 */
class GoldenCreditNoteTest {

    private static final String GOLDEN = "/golden/credit-note-habilitacion-accepted.xml";

    @Test
    void generatedCreditNoteHasTheStructureTheDianAccepted() throws Exception {
        Document golden = parse(getClass().getResourceAsStream(GOLDEN));
        Document generated = signedSample();

        assertThat(skeleton(generated)).containsExactlyElementsOf(skeleton(golden));
    }

    @Test
    void fixedValuesMatchTheAcceptedCreditNote() throws Exception {
        Document golden = parse(getClass().getResourceAsStream(GOLDEN));
        Document generated = signedSample();

        for (String name : List.of("UBLVersionID", "CustomizationID", "ProfileID", "ProfileExecutionID",
                "CreditNoteTypeCode")) {
            assertThat(text(generated, name)).as(name).isEqualTo(text(golden, name));
        }
        Element goldenUuid = rootChild(golden, "UUID");
        Element generatedUuid = rootChild(generated, "UUID");
        assertThat(generatedUuid.getAttribute("schemeName")).isEqualTo(goldenUuid.getAttribute("schemeName"));
        assertThat(generatedUuid.getAttribute("schemeID")).isEqualTo(goldenUuid.getAttribute("schemeID"));
        // CBF04: the accepted note carried the concept's own name, which cleared the notification.
        for (String name : List.of("ResponseCode", "Description")) {
            assertThat(discrepancy(generated, name)).as(name).isEqualTo(discrepancy(golden, name));
        }
    }

    private static String discrepancy(Document doc, String localName) {
        return rootChild(doc, "DiscrepancyResponse").getElementsByTagNameNS("*", localName).item(0).getTextContent();
    }

    private static Document signedSample() throws Exception {
        Document doc = new UblMarshaller().toDocument(new CreditNoteUblMapper().map(sample()));
        try (InputStream in = GoldenCreditNoteTest.class.getResourceAsStream("/test-signer.p12")) {
            var keys = Pkcs12Loader.load(in.readAllBytes(), "cetus-test".toCharArray());
            new XadesSigner().sign(doc, UblMarshaller.signatureSlot(doc), keys, XadesSigner.SignerRole.SUPPLIER);
        }
        return parse(new ByteArrayInputStream(XmlSupport.serialize(doc)));
    }

    /** Total cancellation of the golden invoice sample, as the API builds it: same lines, customer and payment. */
    private static ElectronicCreditNote sample() {
        ElectronicInvoice invoice = GoldenInvoiceTest.sample();
        LocalTime time = LocalTime.of(12, 29, 42);
        String cude = Cufe.compute(new Cufe.Input("NC2", invoice.issueDate(), time, invoice.calculation(),
                "900123456", "900108281", "12345", Environment.TEST));
        return new ElectronicCreditNote(Environment.TEST, "NC", 2, invoice.issueDate(), time, "COP",
                invoice.supplier(), invoice.customer(), invoice.payment(), invoice.calculation(),
                new BillingReference(invoice.fullNumber(), invoice.cufe(), invoice.issueDate()),
                CreditNoteConcept.CANCELLATION, "Anulación total de la factura de prueba", invoice.software(), cude,
                "qr", List.of());
    }
}
