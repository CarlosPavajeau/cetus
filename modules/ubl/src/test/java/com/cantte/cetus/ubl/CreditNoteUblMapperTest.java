package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.dian.Cufe;
import com.cantte.cetus.domain.model.BillingReference;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.ElectronicCreditNote;
import com.cantte.cetus.domain.model.ElectronicInvoice;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.Pkcs12Loader;
import com.cantte.cetus.signing.XadesSigner;
import com.cantte.cetus.signing.XmlSupport;
import com.cantte.cetus.ubl.model.Ns;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

import javax.xml.crypto.dsig.XMLSignature;
import javax.xml.crypto.dsig.XMLSignatureFactory;
import javax.xml.crypto.dsig.dom.DOMValidateContext;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CreditNoteUblMapperTest {

    @Test
    void buildsACreditNoteWithElementsInSchemaOrder() {
        Document doc = new UblMarshaller().toDocument(new CreditNoteUblMapper().map(sampleCreditNote()));
        Element root = doc.getDocumentElement();

        assertThat(root.getLocalName()).isEqualTo("CreditNote");
        assertThat(root.getNamespaceURI()).isEqualTo(Ns.CREDIT_NOTE);
        assertThat(childNames(root)).containsSubsequence(
                "UBLExtensions", "UBLVersionID", "CustomizationID", "ProfileID", "ProfileExecutionID", "ID", "UUID",
                "IssueDate", "IssueTime", "CreditNoteTypeCode", "DocumentCurrencyCode", "LineCountNumeric",
                "DiscrepancyResponse", "BillingReference", "AccountingSupplierParty", "AccountingCustomerParty",
                "PaymentMeans", "TaxTotal", "LegalMonetaryTotal", "CreditNoteLine");
        assertThat(childNames(root)).doesNotContain("DueDate");
    }

    @Test
    void carriesTheNoteCodesAndTheReferencedInvoice() {
        ElectronicCreditNote note = sampleCreditNote();
        Document doc = new UblMarshaller().toDocument(new CreditNoteUblMapper().map(note));

        assertThat(text(doc.getDocumentElement(), Ns.CBC, "CustomizationID")).isEqualTo("20");
        assertThat(text(doc.getDocumentElement(), Ns.CBC, "ProfileID"))
                .isEqualTo("DIAN 2.1: Nota Crédito de Factura Electrónica de Venta");
        assertThat(text(doc.getDocumentElement(), Ns.CBC, "CreditNoteTypeCode")).isEqualTo("91");

        Element uuid = directChild(doc.getDocumentElement(), Ns.CBC, "UUID");
        assertThat(uuid.getAttribute("schemeName")).isEqualTo("CUDE-SHA384");
        assertThat(uuid.getAttribute("schemeID")).isEqualTo("2");
        assertThat(uuid.getTextContent()).isEqualTo(note.cude());

        Element discrepancy = directChild(doc.getDocumentElement(), Ns.CAC, "DiscrepancyResponse");
        assertThat(text(discrepancy, Ns.CBC, "ReferenceID")).isEqualTo("SETP990000001");
        assertThat(text(discrepancy, Ns.CBC, "ResponseCode")).isEqualTo("2");
        // CBF04: the Description must be the concept's name from table 13.2.4; the reason goes in a Note.
        assertThat(text(discrepancy, Ns.CBC, "Description")).isEqualTo("Anulación de factura electrónica");
        assertThat(text(doc.getDocumentElement(), Ns.CBC, "Note")).isEqualTo("Anulación por error en el valor");

        Element reference = (Element) doc.getElementsByTagNameNS(Ns.CAC, "InvoiceDocumentReference").item(0);
        assertThat(text(reference, Ns.CBC, "ID")).isEqualTo("SETP990000001");
        Element cufe = (Element) reference.getElementsByTagNameNS(Ns.CBC, "UUID").item(0);
        assertThat(cufe.getAttribute("schemeName")).isEqualTo("CUFE-SHA384");
        assertThat(cufe.getTextContent()).isEqualTo(note.reference().cufe());
        assertThat(text(reference, Ns.CBC, "IssueDate")).isEqualTo("2026-10-17");

        assertThat(doc.getElementsByTagNameNS(Ns.STS, "InvoiceControl").getLength()).isZero();
        assertThat(doc.getElementsByTagNameNS(Ns.CBC, "CreditedQuantity").getLength()).isEqualTo(1);
        assertThat(doc.getElementsByTagNameNS(Ns.CBC, "InvoicedQuantity").getLength()).isZero();
    }

    @Test
    void theSupplierCarriesTheNotePrefix() {
        Document doc = new UblMarshaller().toDocument(new CreditNoteUblMapper().map(sampleCreditNote()));

        Element supplier = (Element) doc.getElementsByTagNameNS(Ns.CAC, "AccountingSupplierParty").item(0);
        Element scheme = (Element) supplier.getElementsByTagNameNS(Ns.CAC, "CorporateRegistrationScheme").item(0);
        assertThat(text(scheme, Ns.CBC, "ID")).isEqualTo("NC");
    }

    /** The root is renamed to the default namespace before signing, so the signature must still verify. */
    @Test
    void theSignedCreditNoteVerifiesAfterSerialization() throws Exception {
        Document doc = new UblMarshaller().toDocument(new CreditNoteUblMapper().map(sampleCreditNote()));
        KeyMaterial keys;
        try (var in = getClass().getResourceAsStream("/test-signer.p12")) {
            keys = Pkcs12Loader.load(in.readAllBytes(), "cetus-test".toCharArray());
        }
        new XadesSigner().sign(doc, UblMarshaller.signatureSlot(doc), keys, XadesSigner.SignerRole.SUPPLIER);

        byte[] serialized = XmlSupport.serialize(doc);
        assertThat(new String(serialized, StandardCharsets.UTF_8))
                .startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?><CreditNote xmlns=\"" + Ns.CREDIT_NOTE + "\"");
        Document received = XmlSupport.parse(serialized);
        Element signature = (Element) received.getElementsByTagNameNS(XMLSignature.XMLNS, "Signature").item(0);
        DOMValidateContext context = new DOMValidateContext(keys.certificate().getPublicKey(), signature);
        context.setIdAttributeNS((Element) received.getElementsByTagNameNS(XadesSigner.XADES_NS, "SignedProperties").item(0), null, "Id");
        context.setIdAttributeNS((Element) received.getElementsByTagNameNS(XMLSignature.XMLNS, "KeyInfo").item(0), null, "Id");
        assertThat(XMLSignatureFactory.getInstance("DOM").unmarshalXMLSignature(context).validate(context)).isTrue();
    }

    static ElectronicCreditNote sampleCreditNote() {
        ElectronicInvoice invoice = InvoiceUblMapperTest.sampleInvoice();
        LocalDate date = LocalDate.of(2026, 10, 18);
        LocalTime time = LocalTime.of(9, 15);
        String cude = Cufe.compute(new Cufe.Input("NC1", date, time, invoice.calculation(), "900123456",
                "1020304050", "12345", Environment.TEST));
        return new ElectronicCreditNote(Environment.TEST, "NC", 1, date, time, "COP", invoice.supplier(),
                invoice.customer(), invoice.payment(), invoice.calculation(),
                new BillingReference(invoice.fullNumber(), invoice.cufe(), invoice.issueDate()),
                CreditNoteConcept.CANCELLATION, "Anulación por error en el valor", invoice.software(), cude, "qr",
                List.of());
    }

    private static List<String> childNames(Element element) {
        List<String> names = new ArrayList<>();
        for (Node node = element.getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node.getNodeType() == Node.ELEMENT_NODE) {
                names.add(node.getLocalName());
            }
        }
        return names;
    }

    private static Element directChild(Element parent, String ns, String name) {
        for (Node node = parent.getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node instanceof Element element && ns.equals(element.getNamespaceURI())
                    && name.equals(element.getLocalName())) {
                return element;
            }
        }
        throw new AssertionError("No direct child " + name);
    }

    private static String text(Element parent, String ns, String name) {
        return parent.getElementsByTagNameNS(ns, name).item(0).getTextContent();
    }
}
