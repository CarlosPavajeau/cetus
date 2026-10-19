package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.ElectronicInvoice;
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
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AttachedDocumentMapperTest {

    static final String APPLICATION_RESPONSE = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
            + "<ApplicationResponse xmlns=\"urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2\">"
            + "<cbc:ID xmlns:cbc=\"" + Ns.CBC + "\">AR-1 &amp; ]]&gt; ok</cbc:ID></ApplicationResponse>";

    @Test
    void buildsTheContainerWithElementsInSchemaOrder() {
        Document doc = sampleDocument();
        Element root = doc.getDocumentElement();

        assertThat(root.getLocalName()).isEqualTo("AttachedDocument");
        assertThat(root.getNamespaceURI()).isEqualTo(Ns.ATTACHED_DOCUMENT);
        assertThat(childNames(root)).containsExactly(
                "UBLExtensions", "UBLVersionID", "CustomizationID", "ProfileID", "ProfileExecutionID", "ID",
                "IssueDate", "IssueTime", "DocumentType", "ParentDocumentID", "SenderParty", "ReceiverParty",
                "Attachment", "ParentDocumentLineReference");
    }

    @Test
    void carriesTheAnnexLiteralsAndTheParties() {
        ElectronicInvoice invoice = InvoiceUblMapperTest.sampleInvoice();
        Element root = sampleDocument().getDocumentElement();

        assertThat(text(root, Ns.CBC, "CustomizationID")).isEqualTo("Documentos adjuntos");
        assertThat(text(root, Ns.CBC, "ProfileID")).isEqualTo("Factura Electrónica de Venta");
        assertThat(text(root, Ns.CBC, "ProfileExecutionID")).isEqualTo("2");
        assertThat(directText(root, "DocumentType")).isEqualTo("Contenedor de Factura Electrónica");
        assertThat(directText(root, "ParentDocumentID")).isEqualTo(invoice.fullNumber());
        assertThat(directText(root, "IssueDate")).isEqualTo("2026-10-19");
        assertThat(directText(root, "IssueTime")).isEqualTo("08:30:00-05:00");

        Element sender = directChild(root, Ns.CAC, "SenderParty");
        assertThat(text(sender, Ns.CBC, "RegistrationName")).isEqualTo(invoice.supplier().legalName());
        Element senderId = (Element) sender.getElementsByTagNameNS(Ns.CBC, "CompanyID").item(0);
        assertThat(senderId.getTextContent()).isEqualTo(invoice.supplier().identificationNumber());
        assertThat(senderId.getAttribute("schemeAgencyID")).isEqualTo("195");
        assertThat(senderId.getAttribute("schemeID")).isEqualTo(invoice.supplier().checkDigit());
        assertThat(senderId.getAttribute("schemeName")).isEqualTo("31");
        assertThat(sender.getElementsByTagNameNS(Ns.CAC, "RegistrationAddress").getLength()).isZero();

        Element receiver = directChild(root, Ns.CAC, "ReceiverParty");
        assertThat(text(receiver, Ns.CBC, "RegistrationName")).isEqualTo(invoice.customer().legalName());
    }

    @Test
    void embedsBothDocumentsAsCdataThatRoundTripsExactly() {
        ElectronicInvoice invoice = InvoiceUblMapperTest.sampleInvoice();
        byte[] signedXml = signedInvoice();
        Document doc = new UblMarshaller().toDocument(new AttachedDocumentMapper().map(contents(signedXml)));

        Element root = doc.getDocumentElement();
        Node embedded = directChild(root, Ns.CAC, "Attachment")
                .getElementsByTagNameNS(Ns.CBC, "Description").item(0).getFirstChild();
        assertThat(embedded.getNodeType()).isEqualTo(Node.CDATA_SECTION_NODE);

        Document received = XmlSupport.parse(XmlSupport.serialize(doc));
        Element receivedRoot = received.getDocumentElement();
        Element attachment = directChild(receivedRoot, Ns.CAC, "Attachment");
        assertThat(text(attachment, Ns.CBC, "MimeCode")).isEqualTo("text/xml");
        assertThat(text(attachment, Ns.CBC, "EncodingCode")).isEqualTo("UTF-8");
        assertThat(text(attachment, Ns.CBC, "Description")).isEqualTo(new String(signedXml, StandardCharsets.UTF_8));

        Element reference = (Element) received.getElementsByTagNameNS(Ns.CAC, "DocumentReference").item(0);
        assertThat(text(reference, Ns.CBC, "ID")).isEqualTo(invoice.fullNumber());
        Element uuid = (Element) reference.getElementsByTagNameNS(Ns.CBC, "UUID").item(0);
        assertThat(uuid.getTextContent()).isEqualTo(invoice.cufe());
        assertThat(uuid.getAttribute("schemeName")).isEqualTo("CUFE-SHA384");
        assertThat(text(reference, Ns.CBC, "DocumentType")).isEqualTo("ApplicationResponse");
        // "]]>" inside the embedded XML is split across CDATA sections by the serializer and comes back intact.
        assertThat(text(reference, Ns.CBC, "Description")).isEqualTo(APPLICATION_RESPONSE);
        assertThat(text(reference, Ns.CBC, "ValidatorID"))
                .isEqualTo("Unidad Especial Dirección de Impuestos y Aduanas Nacionales");
        assertThat(text(reference, Ns.CBC, "ValidationResultCode")).isEqualTo("02");
        assertThat(text(reference, Ns.CBC, "ValidationDate")).isEqualTo("2026-10-18");
        assertThat(text(reference, Ns.CBC, "ValidationTime")).isEqualTo("21:05:09-05:00");
    }

    @Test
    void notesAreReferencedByTheirCude() {
        AttachedDocumentMapper.Contents base = contents("<x/>".getBytes(StandardCharsets.UTF_8));
        AttachedDocumentMapper.Contents note = new AttachedDocumentMapper.Contents(base.environment(),
                DocumentType.CREDIT_NOTE, "NC1", "cude", base.supplier(), base.customer(), base.signedXml(),
                base.applicationResponse(), base.validatedAt(), base.issuedAt());
        Document doc = new UblMarshaller().toDocument(new AttachedDocumentMapper().map(note));

        Element reference = (Element) doc.getElementsByTagNameNS(Ns.CAC, "DocumentReference").item(0);
        Element uuid = (Element) reference.getElementsByTagNameNS(Ns.CBC, "UUID").item(0);
        assertThat(uuid.getAttribute("schemeName")).isEqualTo("CUDE-SHA384");
        assertThat(uuid.getTextContent()).isEqualTo("cude");
    }

    @Test
    void theSignedContainerVerifiesAfterSerialization() throws Exception {
        Document doc = sampleDocument();
        KeyMaterial keys = keys();
        new XadesSigner().sign(doc, UblMarshaller.signatureSlot(doc), keys, XadesSigner.SignerRole.SUPPLIER);

        byte[] serialized = XmlSupport.serialize(doc);
        assertThat(new String(serialized, StandardCharsets.UTF_8)).contains("<AttachedDocument xmlns=\"" + Ns.ATTACHED_DOCUMENT + "\"");
        Document received = XmlSupport.parse(serialized);
        assertThat(received.getElementsByTagNameNS(Ns.EXT, "UBLExtension").getLength()).isEqualTo(1);
        Element signature = (Element) received.getElementsByTagNameNS(XMLSignature.XMLNS, "Signature").item(0);
        DOMValidateContext context = new DOMValidateContext(keys.certificate().getPublicKey(), signature);
        context.setIdAttributeNS((Element) received.getElementsByTagNameNS(XadesSigner.XADES_NS, "SignedProperties").item(0), null, "Id");
        context.setIdAttributeNS((Element) received.getElementsByTagNameNS(XMLSignature.XMLNS, "KeyInfo").item(0), null, "Id");
        assertThat(XMLSignatureFactory.getInstance("DOM").unmarshalXMLSignature(context).validate(context)).isTrue();
    }

    static Document sampleDocument() {
        return new UblMarshaller().toDocument(new AttachedDocumentMapper().map(contents(signedInvoice())));
    }

    static AttachedDocumentMapper.Contents contents(byte[] signedXml) {
        ElectronicInvoice invoice = InvoiceUblMapperTest.sampleInvoice();
        return new AttachedDocumentMapper.Contents(invoice.environment(), DocumentType.INVOICE, invoice.fullNumber(),
                invoice.cufe(), invoice.supplier(), invoice.customer(), signedXml,
                APPLICATION_RESPONSE.getBytes(StandardCharsets.UTF_8),
                OffsetDateTime.of(2026, 10, 19, 2, 5, 9, 500, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 10, 19, 8, 30, 0, 0, ZoneOffset.ofHours(-5)));
    }

    private static byte[] signedInvoice() {
        Document invoice = new UblMarshaller().toDocument(new InvoiceUblMapper().map(InvoiceUblMapperTest.sampleInvoice()));
        new XadesSigner().sign(invoice, UblMarshaller.signatureSlot(invoice), keys(), XadesSigner.SignerRole.SUPPLIER);
        return XmlSupport.serialize(invoice);
    }

    private static KeyMaterial keys() {
        try (var in = AttachedDocumentMapperTest.class.getResourceAsStream("/test-signer.p12")) {
            return Pkcs12Loader.load(in.readAllBytes(), "cetus-test".toCharArray());
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
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

    private static String directText(Element parent, String name) {
        return directChild(parent, Ns.CBC, name).getTextContent();
    }

    private static String text(Element parent, String ns, String name) {
        return parent.getElementsByTagNameNS(ns, name).item(0).getTextContent();
    }
}
