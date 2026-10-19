package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.dian.Cufe;
import com.cantte.cetus.domain.model.BillingReference;
import com.cantte.cetus.domain.model.DebitNoteConcept;
import com.cantte.cetus.domain.model.ElectronicDebitNote;
import com.cantte.cetus.domain.model.ElectronicInvoice;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.TaxType;
import com.cantte.cetus.signing.Pkcs12Loader;
import com.cantte.cetus.signing.XadesSigner;
import com.cantte.cetus.signing.XmlSupport;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

import static com.cantte.cetus.ubl.GoldenInvoiceTest.parse;
import static com.cantte.cetus.ubl.GoldenInvoiceTest.rootChild;
import static com.cantte.cetus.ubl.GoldenInvoiceTest.skeleton;
import static com.cantte.cetus.ubl.GoldenInvoiceTest.text;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Compares the structure of a freshly built and signed debit note with ND1, the interest charged on
 * SETP990000008 the DIAN accepted in habilitación (anonymized in golden/debit-note-habilitacion-accepted.xml).
 * Its only notification, DAJ39, comes from the issuer's data: a natural person not responsible for IVA,
 * whose TaxScheme is ZZ where the rule expects 01. Same approach as {@link GoldenInvoiceTest}.
 */
class GoldenDebitNoteTest {

    private static final String GOLDEN = "/golden/debit-note-habilitacion-accepted.xml";

    @Test
    void generatedDebitNoteHasTheStructureTheDianAccepted() throws Exception {
        Document golden = parse(getClass().getResourceAsStream(GOLDEN));
        Document generated = signedSample();

        assertThat(skeleton(generated)).containsExactlyElementsOf(skeleton(golden));
    }

    @Test
    void fixedValuesMatchTheAcceptedDebitNote() throws Exception {
        Document golden = parse(getClass().getResourceAsStream(GOLDEN));
        Document generated = signedSample();

        for (String name : List.of("UBLVersionID", "CustomizationID", "ProfileID", "ProfileExecutionID")) {
            assertThat(text(generated, name)).as(name).isEqualTo(text(golden, name));
        }
        Element goldenUuid = rootChild(golden, "UUID");
        Element generatedUuid = rootChild(generated, "UUID");
        assertThat(generatedUuid.getAttribute("schemeName")).isEqualTo(goldenUuid.getAttribute("schemeName"));
        assertThat(generatedUuid.getAttribute("schemeID")).isEqualTo(goldenUuid.getAttribute("schemeID"));
        // DBF04 rejects a Description that is not the concept's own name.
        for (String name : List.of("ResponseCode", "Description")) {
            assertThat(discrepancy(generated, name)).as(name).isEqualTo(discrepancy(golden, name));
        }
    }

    private static String discrepancy(Document doc, String localName) {
        return rootChild(doc, "DiscrepancyResponse").getElementsByTagNameNS("*", localName).item(0).getTextContent();
    }

    private static Document signedSample() throws Exception {
        Document doc = new UblMarshaller().toDocument(new DebitNoteUblMapper().map(sample()));
        try (InputStream in = GoldenDebitNoteTest.class.getResourceAsStream("/test-signer.p12")) {
            var keys = Pkcs12Loader.load(in.readAllBytes(), "cetus-test".toCharArray());
            new XadesSigner().sign(doc, UblMarshaller.signatureSlot(doc), keys, XadesSigner.SignerRole.SUPPLIER);
        }
        return parse(new ByteArrayInputStream(XmlSupport.serialize(doc)));
    }

    /** Interest of 2.000 plus IVA on the golden invoice sample, as the API builds it: customer and payment of the invoice. */
    private static ElectronicDebitNote sample() {
        ElectronicInvoice invoice = GoldenInvoiceTest.sample();
        LocalTime time = LocalTime.of(15, 1, 33);
        CalculationResult calc = new InvoiceCalculator().calculate(List.of(new LineInput("INT-001", "Intereses de mora",
                BigDecimal.ONE, "94", new BigDecimal("2000"), List.of(new LineInput.LineTax(TaxType.IVA, new BigDecimal("19"))))));
        String cude = Cufe.compute(new Cufe.Input("ND1", invoice.issueDate(), time, calc, "900123456", "900108281",
                "12345", Environment.TEST));
        return new ElectronicDebitNote(Environment.TEST, "ND", 1, invoice.issueDate(), time, "COP",
                invoice.supplier(), invoice.customer(), invoice.payment(), calc,
                new BillingReference(invoice.fullNumber(), invoice.cufe(), invoice.issueDate()),
                DebitNoteConcept.INTEREST, "Intereses de mora por pago tardío", invoice.software(), cude, "qr",
                List.of());
    }
}
