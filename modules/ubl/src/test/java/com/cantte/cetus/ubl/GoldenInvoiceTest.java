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
import org.junit.jupiter.api.Test;
import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Compares the structure of a freshly built and signed invoice with SETP990000003, the invoice the
 * DIAN accepted in habilitación (anonymized in golden/invoice-habilitacion-accepted.xml). The
 * sample below has the same shape: a natural person supplier, a note, a due date, credit payment
 * and two lines at 16 % and 19 % IVA. Values are not compared, only which elements and attributes
 * appear and in what order, so any change to the generated structure has to be deliberate.
 */
class GoldenInvoiceTest {

    @Test
    void generatedInvoiceHasTheStructureTheDianAccepted() throws Exception {
        Document golden = parse(getClass().getResourceAsStream("/golden/invoice-habilitacion-accepted.xml"));
        Document generated = signedSample();

        assertThat(skeleton(generated)).containsExactlyElementsOf(skeleton(golden));
    }

    @Test
    void fixedValuesMatchTheAcceptedInvoice() throws Exception {
        Document golden = parse(getClass().getResourceAsStream("/golden/invoice-habilitacion-accepted.xml"));
        Document generated = signedSample();

        for (String name : List.of("UBLVersionID", "CustomizationID", "ProfileID", "ProfileExecutionID",
                "InvoiceTypeCode")) {
            assertThat(text(generated, name)).as(name).isEqualTo(text(golden, name));
        }
        Element goldenUuid = rootChild(golden, "UUID");
        Element generatedUuid = rootChild(generated, "UUID");
        assertThat(generatedUuid.getAttribute("schemeName")).isEqualTo(goldenUuid.getAttribute("schemeName"));
        assertThat(generatedUuid.getAttribute("schemeID")).isEqualTo(goldenUuid.getAttribute("schemeID"));
    }

    private static Document signedSample() throws Exception {
        Document doc = new UblMarshaller().toDocument(new InvoiceUblMapper().map(sample()));
        try (InputStream in = GoldenInvoiceTest.class.getResourceAsStream("/test-signer.p12")) {
            var keys = Pkcs12Loader.load(in.readAllBytes(), "cetus-test".toCharArray());
            new XadesSigner().sign(doc, UblMarshaller.signatureSlot(doc), keys, XadesSigner.SignerRole.SUPPLIER);
        }
        // Round trip, as the worker stores and sends the serialized bytes.
        return parse(new ByteArrayInputStream(XmlSupport.serialize(doc)));
    }

    private static ElectronicInvoice sample() {
        var calc = new InvoiceCalculator().calculate(List.of(
                new LineInput("AOHV84-225", "AV OASYS -2.25 (8.4) LENTE DE CONTATO", new BigDecimal("1"), "EA",
                        new BigDecimal("12600.06"), List.of(new LineInput.LineTax(TaxType.IVA, new BigDecimal("19")))),
                new LineInput("91412012412", "Bolsa", new BigDecimal("1"), "NIU", new BigDecimal("100"),
                        List.of(new LineInput.LineTax(TaxType.IVA, new BigDecimal("16"))))));
        Party supplier = new Party(PersonType.NATURAL_PERSON, IdentificationType.NIT, "900123456", "1",
                "Cetus Pruebas SAS", null, List.of("O-47"), "ZZ", "No aplica",
                new Address("20001", "Valledupar", "20", "Cesar", "200001", "Calle 100 # 10-20", "CO", "Colombia"),
                "facturas@cetus.test", "6015550000");
        Party customer = new Party(PersonType.LEGAL_ENTITY, IdentificationType.NIT, "900108281", "3",
                "OPTICAS GMO COLOMBIA S A S", null, List.of("R-99-PN"), "01", "IVA",
                new Address("11001", "Bogotá, D.C.", "11", "Bogotá", "110311", "CARRERA 8 No 20-14/40", "CO",
                        "Colombia"),
                "dcruz@empresa.org", "31031031089");
        LocalDate date = LocalDate.of(2026, 10, 19);
        LocalTime time = LocalTime.of(9, 57, 1);
        String cufe = Cufe.compute(new Cufe.Input("SETP990000003", date, time, calc, "900123456", "900108281",
                "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c", Environment.TEST));
        return new ElectronicInvoice(Environment.TEST, "10", "SETP", 990000003, date, time, date.plusDays(30), "COP",
                supplier, customer, new PaymentInfo("2", "42", date.plusDays(30)), calc,
                new NumberingAuthorization("18760000001", LocalDate.of(2019, 1, 19), LocalDate.of(2030, 1, 19),
                        "SETP", 990000000, 995000000),
                new SoftwareInfo("900123456", "1", "00000000-0000-0000-0000-000000000000", "security-code"),
                cufe, "qr", List.of("Factura de prueba basada en la ejemplificación Generica.xml de la DIAN"));
    }

    /**
     * Every element path with its attribute names, in document order. Repeated siblings (lines,
     * tax subtotals, certificates) collapse into their first occurrence.
     */
    private static List<String> skeleton(Document doc) {
        Set<String> paths = new LinkedHashSet<>();
        collect(doc.getDocumentElement(), "", paths);
        return new ArrayList<>(paths);
    }

    private static void collect(Element element, String parent, Set<String> paths) {
        String path = parent + "/" + element.getNodeName();
        List<String> attributes = new ArrayList<>();
        NamedNodeMap map = element.getAttributes();
        for (int i = 0; i < map.getLength(); i++) {
            String name = ((Attr) map.item(i)).getName();
            if (!name.equals("xmlns") && !name.startsWith("xmlns:")) {
                attributes.add(name);
            }
        }
        attributes.sort(null);
        paths.add(attributes.isEmpty() ? path : path + " @" + String.join(",", attributes));
        for (Node child = element.getFirstChild(); child != null; child = child.getNextSibling()) {
            if (child instanceof Element childElement) {
                collect(childElement, path, paths);
            }
        }
    }

    private static Element rootChild(Document doc, String localName) {
        for (Node child = doc.getDocumentElement().getFirstChild(); child != null; child = child.getNextSibling()) {
            if (child instanceof Element element && localName.equals(element.getLocalName())) {
                return element;
            }
        }
        throw new AssertionError("No " + localName);
    }

    private static String text(Document doc, String localName) {
        return rootChild(doc, localName).getTextContent();
    }

    private static Document parse(InputStream in) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        try (in) {
            return factory.newDocumentBuilder().parse(in);
        }
    }
}
