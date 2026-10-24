package com.cantte.cetus.signing;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import javax.xml.crypto.dsig.XMLSignature;
import javax.xml.crypto.dsig.XMLSignatureFactory;
import javax.xml.crypto.dsig.dom.DOMValidateContext;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

class XadesSignerTest {

    static KeyMaterial keys() throws Exception {
        try (var in = XadesSignerTest.class.getResourceAsStream("/test-signer.p12")) {
            return Pkcs12Loader.load(in.readAllBytes(), "cetus-test".toCharArray());
        }
    }

    @Test
    void producesAValidEnvelopedSignatureInTheSecondExtension() throws Exception {
        String xml = """
                <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
                         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
                         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"><ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent>dian</ext:ExtensionContent></ext:UBLExtension><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions><cbc:ID>SETP990000001</cbc:ID></Invoice>""";
        KeyMaterial keys = keys();
        Document doc = XmlSupport.parse(xml.getBytes(StandardCharsets.UTF_8));
        Element slot =
                (Element) doc.getElementsByTagNameNS("*", "ExtensionContent").item(1);

        new XadesSigner().sign(doc, slot, keys, XadesSigner.SignerRole.SUPPLIER);

        // Serialize and parse again, as the DIAN would.
        byte[] serialized = XmlSupport.serialize(doc);
        // Wrapped base64 (CRLF serialized as "&#13;") is valid XML DSig, but the DIAN rejects it with ZE02.
        assertThat(new String(serialized, StandardCharsets.UTF_8)).doesNotContain("&#13;", "\r", "\n");
        Document received = XmlSupport.parse(serialized);
        assertThat(validate(received, keys)).isTrue();
        assertThat(received.getElementsByTagNameNS(XadesSigner.XADES_NS, "SigPolicyHash")
                        .getLength())
                .isEqualTo(1);
    }

    private static boolean validate(Document doc, KeyMaterial keys) throws Exception {
        Element signatureElement = (Element)
                doc.getElementsByTagNameNS(XMLSignature.XMLNS, "Signature").item(0);
        DOMValidateContext context = new DOMValidateContext(keys.certificate().getPublicKey(), signatureElement);
        context.setIdAttributeNS(
                (Element) doc.getElementsByTagNameNS(XadesSigner.XADES_NS, "SignedProperties")
                        .item(0),
                null,
                "Id");
        context.setIdAttributeNS(
                (Element) doc.getElementsByTagNameNS(XMLSignature.XMLNS, "KeyInfo")
                        .item(0),
                null,
                "Id");
        XMLSignature signature = XMLSignatureFactory.getInstance("DOM").unmarshalXMLSignature(context);
        return signature.validate(context);
    }
}
