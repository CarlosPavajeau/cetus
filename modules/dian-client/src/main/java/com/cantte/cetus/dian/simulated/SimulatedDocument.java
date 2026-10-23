package com.cantte.cetus.dian.simulated;

import com.cantte.cetus.signing.XmlSupport;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * What the simulator reads from a signed UBL document, the same fields the DIAN uses to answer.
 *
 * @param kind         the root element: Invoice, CreditNote or DebitNote
 * @param number       cbc:ID, prefix and number together (SETP990000003)
 * @param uniqueCode   cbc:UUID, the CUFE or CUDE
 * @param fileName     the XML file name inside the zip, without its extension
 * @param supplierNit  the issuer, who receives the ApplicationResponse
 * @param customerId   the identification number of the customer, which picks the scenario
 */
public record SimulatedDocument(Kind kind, String number, String uniqueCode, String fileName, String supplierNit,
                                String supplierName, String customerId) {

    private static final String CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
    private static final String CAC = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";

    public enum Kind {
        INVOICE("Factura electrónica", "CUFE-SHA384"),
        CREDIT_NOTE("Nota Crédito electrónica", "CUDE-SHA384"),
        DEBIT_NOTE("Nota Débito electrónica", "CUDE-SHA384");

        private final String label;
        private final String uniqueCodeScheme;

        Kind(String label, String uniqueCodeScheme) {
            this.label = label;
            this.uniqueCodeScheme = uniqueCodeScheme;
        }

        public String label() {
            return label;
        }

        public String uniqueCodeScheme() {
            return uniqueCodeScheme;
        }
    }

    /** The single XML a SendBillSync zip carries. */
    public static SimulatedDocument fromZip(byte[] zip) {
        try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(zip))) {
            ZipEntry entry = in.getNextEntry();
            if (entry == null) {
                throw new IllegalArgumentException("The zip is empty");
            }
            String name = entry.getName().replaceFirst("\\.xml$", "");
            return fromXml(name, in.readAllBytes());
        } catch (IOException e) {
            throw new IllegalArgumentException("Invalid zip: " + e.getMessage(), e);
        }
    }

    public static SimulatedDocument fromXml(String fileName, byte[] xml) {
        Element root = XmlSupport.parse(xml).getDocumentElement();
        Kind kind = switch (root.getLocalName()) {
            case "Invoice" -> Kind.INVOICE;
            case "CreditNote" -> Kind.CREDIT_NOTE;
            case "DebitNote" -> Kind.DEBIT_NOTE;
            default -> throw new IllegalArgumentException("Not a UBL document: " + root.getLocalName());
        };
        Element supplier = path(root, CAC, "AccountingSupplierParty", "Party", "PartyTaxScheme");
        Element customer = path(root, CAC, "AccountingCustomerParty", "Party", "PartyTaxScheme");
        return new SimulatedDocument(kind, text(child(root, CBC, "ID")), text(child(root, CBC, "UUID")), fileName,
                text(child(supplier, CBC, "CompanyID")), text(child(supplier, CBC, "RegistrationName")),
                text(child(customer, CBC, "CompanyID")));
    }

    /** SETP990000003 as the DIAN writes it in its messages: SETP-990000003. */
    public String displayNumber() {
        int digits = 0;
        while (digits < number.length() && !Character.isDigit(number.charAt(digits))) {
            digits++;
        }
        return digits == 0 ? number : number.substring(0, digits) + "-" + number.substring(digits);
    }

    private static Element path(Element from, String ns, String... names) {
        Element current = from;
        for (String name : names) {
            current = child(current, ns, name);
        }
        return current;
    }

    private static Element child(Element parent, String ns, String name) {
        if (parent != null) {
            for (Node node = parent.getFirstChild(); node != null; node = node.getNextSibling()) {
                if (node instanceof Element element && ns.equals(element.getNamespaceURI())
                        && name.equals(element.getLocalName())) {
                    return element;
                }
            }
        }
        return null;
    }

    private static String text(Element element) {
        return element == null ? null : element.getTextContent().strip();
    }
}
