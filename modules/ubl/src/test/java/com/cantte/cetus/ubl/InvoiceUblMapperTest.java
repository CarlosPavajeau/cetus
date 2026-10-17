package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.dian.Cufe;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.ElectronicInvoice;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.NumberingAuthorization;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PaymentInfo;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.domain.model.SoftwareInfo;
import com.cantte.cetus.domain.model.TaxType;
import com.cantte.cetus.signing.Pkcs12Loader;
import com.cantte.cetus.signing.XadesSigner;
import com.cantte.cetus.signing.XmlSupport;
import com.cantte.cetus.ubl.model.Ns;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Golden-path test of the UBL pipeline. When the DIAN XSDs are in src/main/xsd, add schema
 * validation here, and keep a known-good XML accepted in habilitación as a golden file.
 */
class InvoiceUblMapperTest {

    @Test
    void buildsAnInvoiceWithElementsInSchemaOrder() throws Exception {
        Document doc = new UblMarshaller().toDocument(new InvoiceUblMapper().map(sampleInvoice()));
        Element root = doc.getDocumentElement();

        assertThat(root.getLocalName()).isEqualTo("Invoice");
        assertThat(root.getNamespaceURI()).isEqualTo(Ns.INVOICE);
        assertThat(childNames(root)).containsSubsequence(
                "UBLExtensions", "UBLVersionID", "CustomizationID", "ProfileID", "ProfileExecutionID", "ID", "UUID",
                "IssueDate", "IssueTime", "InvoiceTypeCode", "DocumentCurrencyCode", "LineCountNumeric",
                "AccountingSupplierParty", "AccountingCustomerParty", "PaymentMeans", "TaxTotal",
                "LegalMonetaryTotal", "InvoiceLine");
        assertThat(doc.getElementsByTagNameNS(Ns.STS, "DianExtensions").getLength()).isEqualTo(1);
        assertThat(text(doc, Ns.CBC, "PayableAmount")).isEqualTo("119000.00");
    }

    @Test
    void theSignedDocumentKeepsItsSignatureAfterSerialization() throws Exception {
        Document doc = new UblMarshaller().toDocument(new InvoiceUblMapper().map(sampleInvoice()));
        try (var in = getClass().getResourceAsStream("/test-signer.p12")) {
            var keys = Pkcs12Loader.load(in.readAllBytes(), "cetus-test".toCharArray());
            new XadesSigner().sign(doc, UblMarshaller.signatureSlot(doc), keys, XadesSigner.SignerRole.SUPPLIER);
        }
        String xml = new String(XmlSupport.serialize(doc), StandardCharsets.UTF_8);
        assertThat(xml).contains("ds:SignatureValue").contains("xades:SignedProperties");
    }

    private static ElectronicInvoice sampleInvoice() {
        var calc = new InvoiceCalculator().calculate(List.of(new LineInput("SKU-1", "Servicio de consultoría",
                new BigDecimal("1"), "94", new BigDecimal("100000"),
                List.of(new LineInput.LineTax(TaxType.IVA, new BigDecimal("19"))))));
        Address address = new Address("11001", "Bogotá, D.C.", "11", "Bogotá", "110111", "Calle 100 # 10-20", "CO", "Colombia");
        Party supplier = new Party(PersonType.LEGAL_ENTITY, IdentificationType.NIT, "900123456", "8", "Cantte S.A.S.",
                "Cantte", List.of("O-13"), "01", "IVA", address, "facturas@cantte.com", "6015550000");
        Party customer = new Party(PersonType.NATURAL_PERSON, IdentificationType.CITIZEN_ID, "1020304050", null,
                "Ana Pérez", null, List.of("R-99-PN"), "ZZ", "No aplica", address, "ana@example.com", null);
        LocalDate date = LocalDate.of(2026, 10, 17);
        LocalTime time = LocalTime.of(10, 30);
        String cufe = Cufe.compute(new Cufe.Input("SETP990000001", date, time, calc, "900123456", "1020304050",
                "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c", Environment.TEST));
        return new ElectronicInvoice(Environment.TEST, "10", "SETP", 990000001, date, time, null, "COP",
                supplier, customer, new PaymentInfo("1", "10", null), calc,
                new NumberingAuthorization("18760000001", LocalDate.of(2019, 1, 19), LocalDate.of(2030, 1, 19),
                        "SETP", 990000000, 995000000),
                new SoftwareInfo("900123456", "8", "software-id", "security-code"), cufe, "qr", List.of());
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

    private static String text(Document doc, String ns, String name) {
        return doc.getElementsByTagNameNS(ns, name).item(0).getTextContent();
    }
}
