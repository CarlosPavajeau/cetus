package com.cantte.cetus.ubl;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.dian.Cufe;
import com.cantte.cetus.domain.model.BillingReference;
import com.cantte.cetus.domain.model.DebitNoteConcept;
import com.cantte.cetus.domain.model.ElectronicDebitNote;
import com.cantte.cetus.domain.model.ElectronicInvoice;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.TaxType;
import com.cantte.cetus.ubl.model.Ns;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

class DebitNoteUblMapperTest {

    @Test
    void buildsADebitNoteWithElementsInSchemaOrder() {
        Document doc = new UblMarshaller().toDocument(new DebitNoteUblMapper().map(sampleDebitNote()));
        Element root = doc.getDocumentElement();

        assertThat(root.getLocalName()).isEqualTo("DebitNote");
        assertThat(root.getNamespaceURI()).isEqualTo(Ns.DEBIT_NOTE);
        assertThat(root.getPrefix()).isNull();
        assertThat(childNames(root))
                .containsSubsequence(
                        "UBLExtensions",
                        "UBLVersionID",
                        "CustomizationID",
                        "ProfileID",
                        "ProfileExecutionID",
                        "ID",
                        "UUID",
                        "IssueDate",
                        "IssueTime",
                        "Note",
                        "DocumentCurrencyCode",
                        "LineCountNumeric",
                        "DiscrepancyResponse",
                        "BillingReference",
                        "AccountingSupplierParty",
                        "AccountingCustomerParty",
                        "PaymentMeans",
                        "TaxTotal",
                        "RequestedMonetaryTotal",
                        "DebitNoteLine");
        // The DebitNote schema has no type code and no LegalMonetaryTotal.
        assertThat(childNames(root))
                .doesNotContain("DebitNoteTypeCode", "CreditNoteTypeCode", "LegalMonetaryTotal", "DueDate");
    }

    @Test
    void carriesTheNoteCodesAndTheReferencedInvoice() {
        ElectronicDebitNote note = sampleDebitNote();
        Document doc = new UblMarshaller().toDocument(new DebitNoteUblMapper().map(note));
        Element root = doc.getDocumentElement();

        assertThat(text(root, Ns.CBC, "CustomizationID")).isEqualTo("30");
        assertThat(text(root, Ns.CBC, "ProfileID")).isEqualTo("DIAN 2.1: Nota Débito de Factura Electrónica de Venta");

        Element uuid = directChild(root, Ns.CBC, "UUID");
        assertThat(uuid.getAttribute("schemeName")).isEqualTo("CUDE-SHA384");
        assertThat(uuid.getAttribute("schemeID")).isEqualTo("2");
        assertThat(uuid.getTextContent()).isEqualTo(note.cude());

        Element discrepancy = directChild(root, Ns.CAC, "DiscrepancyResponse");
        assertThat(text(discrepancy, Ns.CBC, "ReferenceID")).isEqualTo("SETP990000001");
        assertThat(text(discrepancy, Ns.CBC, "ResponseCode")).isEqualTo("1");
        // DBF04: the Description must be the concept's name from table 13.2.5; the reason goes in a Note.
        assertThat(text(discrepancy, Ns.CBC, "Description")).isEqualTo("Intereses");
        assertThat(text(root, Ns.CBC, "Note")).isEqualTo("Intereses de mora de octubre");

        Element reference = (Element)
                doc.getElementsByTagNameNS(Ns.CAC, "InvoiceDocumentReference").item(0);
        assertThat(text(reference, Ns.CBC, "ID")).isEqualTo("SETP990000001");
        Element cufe =
                (Element) reference.getElementsByTagNameNS(Ns.CBC, "UUID").item(0);
        assertThat(cufe.getAttribute("schemeName")).isEqualTo("CUFE-SHA384");
        assertThat(cufe.getTextContent()).isEqualTo(note.reference().cufe());

        Element totals = directChild(root, Ns.CAC, "RequestedMonetaryTotal");
        assertThat(text(totals, Ns.CBC, "LineExtensionAmount")).isEqualTo("5000.00");
        assertThat(text(totals, Ns.CBC, "PayableAmount")).isEqualTo("5950.00");

        assertThat(doc.getElementsByTagNameNS(Ns.STS, "InvoiceControl").getLength())
                .isZero();
        assertThat(doc.getElementsByTagNameNS(Ns.CBC, "DebitedQuantity").getLength())
                .isEqualTo(1);
        assertThat(doc.getElementsByTagNameNS(Ns.CBC, "InvoicedQuantity").getLength())
                .isZero();
    }

    @Test
    void theSupplierCarriesTheNotePrefix() {
        Document doc = new UblMarshaller().toDocument(new DebitNoteUblMapper().map(sampleDebitNote()));

        Element supplier = (Element)
                doc.getElementsByTagNameNS(Ns.CAC, "AccountingSupplierParty").item(0);
        Element scheme = (Element) supplier.getElementsByTagNameNS(Ns.CAC, "CorporateRegistrationScheme")
                .item(0);
        assertThat(text(scheme, Ns.CBC, "ID")).isEqualTo("ND");
    }

    /** Interest of 5.000 plus IVA on the sample invoice. */
    static ElectronicDebitNote sampleDebitNote() {
        ElectronicInvoice invoice = InvoiceUblMapperTest.sampleInvoice();
        LocalDate date = LocalDate.of(2026, 10, 18);
        LocalTime time = LocalTime.of(9, 15);
        var calc = new InvoiceCalculator()
                .calculate(List.of(new LineInput(
                        "INT",
                        "Intereses de mora",
                        BigDecimal.ONE,
                        "94",
                        new BigDecimal("5000"),
                        List.of(new LineInput.LineTax(TaxType.IVA, new BigDecimal("19"))))));
        String cude = Cufe.compute(
                new Cufe.Input("ND1", date, time, calc, "900123456", "1020304050", "12345", Environment.TEST));
        return new ElectronicDebitNote(
                Environment.TEST,
                "ND",
                1,
                date,
                time,
                "COP",
                invoice.supplier(),
                invoice.customer(),
                invoice.payment(),
                calc,
                new BillingReference(invoice.fullNumber(), invoice.cufe(), invoice.issueDate()),
                DebitNoteConcept.INTEREST,
                "Intereses de mora de octubre",
                invoice.software(),
                cude,
                "qr",
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
            if (node instanceof Element element
                    && ns.equals(element.getNamespaceURI())
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
