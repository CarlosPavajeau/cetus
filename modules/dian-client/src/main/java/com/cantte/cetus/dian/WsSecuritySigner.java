package com.cantte.cetus.dian;

import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.SigningException;
import com.cantte.cetus.signing.XadesSigner;
import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import javax.xml.crypto.dom.DOMStructure;
import javax.xml.crypto.dsig.CanonicalizationMethod;
import javax.xml.crypto.dsig.DigestMethod;
import javax.xml.crypto.dsig.Reference;
import javax.xml.crypto.dsig.SignatureMethod;
import javax.xml.crypto.dsig.SignedInfo;
import javax.xml.crypto.dsig.XMLSignature;
import javax.xml.crypto.dsig.XMLSignatureFactory;
import javax.xml.crypto.dsig.dom.DOMSignContext;
import javax.xml.crypto.dsig.keyinfo.KeyInfo;
import javax.xml.crypto.dsig.spec.ExcC14NParameterSpec;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

/**
 * Adds the WS-Security header expected by the DIAN: Timestamp, the certificate as a
 * BinarySecurityToken and an exclusive-c14n RSA-SHA256 signature over {@code wsa:To}.
 *
 * <p>This is the most fragile part of the integration. When the DIAN rejects the header,
 * compare the serialized envelope with a known-good request from the web services guide.
 */
final class WsSecuritySigner {

    static final String WSSE_NS = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd";
    static final String WSU_NS = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd";
    private static final String BASE64_ENCODING =
            "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary";
    private static final String X509_TOKEN =
            "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3";
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ISO_INSTANT;

    static {
        // Must be set before the first signature in the JVM; see XadesSigner.
        System.setProperty(XadesSigner.IGNORE_LINE_BREAKS, "true");
    }

    private final Clock clock;
    private final long timestampTtlSeconds;

    WsSecuritySigner(Clock clock, long timestampTtlSeconds) {
        this.clock = clock;
        this.timestampTtlSeconds = timestampTtlSeconds;
    }

    void sign(SoapEnvelopeBuilder.Envelope envelope, KeyMaterial keys) {
        Document doc = envelope.document();
        try {
            Element security = doc.createElementNS(WSSE_NS, "wsse:Security");
            security.setAttributeNS(SoapEnvelopeBuilder.XMLNS_NS, "xmlns:wsse", WSSE_NS);
            security.setAttributeNS(SoapEnvelopeBuilder.XMLNS_NS, "xmlns:wsu", WSU_NS);
            security.setAttributeNS(SoapEnvelopeBuilder.SOAP_NS, "soap:mustUnderstand", "true");
            envelope.header().insertBefore(security, envelope.header().getFirstChild());

            String suffix = UUID.randomUUID().toString().replace("-", "").toUpperCase();
            Instant now = clock.instant().truncatedTo(ChronoUnit.MILLIS);
            Element timestamp = append(security, doc.createElementNS(WSU_NS, "wsu:Timestamp"));
            timestamp.setAttributeNS(WSU_NS, "wsu:Id", "TS-" + suffix);
            append(timestamp, doc.createElementNS(WSU_NS, "wsu:Created")).setTextContent(TIMESTAMP.format(now));
            append(timestamp, doc.createElementNS(WSU_NS, "wsu:Expires"))
                    .setTextContent(TIMESTAMP.format(now.plusSeconds(timestampTtlSeconds)));

            String tokenId = "X509-" + suffix;
            Element token = append(security, doc.createElementNS(WSSE_NS, "wsse:BinarySecurityToken"));
            token.setAttribute("EncodingType", BASE64_ENCODING);
            token.setAttribute("ValueType", X509_TOKEN);
            token.setAttributeNS(WSU_NS, "wsu:Id", tokenId);
            token.setTextContent(
                    Base64.getEncoder().encodeToString(keys.certificate().getEncoded()));

            XMLSignatureFactory factory = XMLSignatureFactory.getInstance("DOM");
            String toId = envelope.to().getAttributeNS(WSU_NS, "Id");
            Reference toReference = factory.newReference(
                    "#" + toId,
                    factory.newDigestMethod(DigestMethod.SHA256, null),
                    List.of(factory.newTransform(
                            CanonicalizationMethod.EXCLUSIVE, new ExcC14NParameterSpec(List.of("soap", "wcf")))),
                    null,
                    null);

            SignedInfo signedInfo = factory.newSignedInfo(
                    factory.newCanonicalizationMethod(
                            CanonicalizationMethod.EXCLUSIVE, new ExcC14NParameterSpec(List.of("wsa", "soap", "wcf"))),
                    factory.newSignatureMethod(SignatureMethod.RSA_SHA256, null),
                    List.of(toReference));

            Element tokenReference = doc.createElementNS(WSSE_NS, "wsse:SecurityTokenReference");
            tokenReference.setAttributeNS(WSU_NS, "wsu:Id", "STR-" + suffix);
            Element reference = append(tokenReference, doc.createElementNS(WSSE_NS, "wsse:Reference"));
            reference.setAttribute("URI", "#" + tokenId);
            reference.setAttribute("ValueType", X509_TOKEN);
            KeyInfo keyInfo =
                    factory.getKeyInfoFactory().newKeyInfo(List.of(new DOMStructure(tokenReference)), "KI-" + suffix);

            XMLSignature signature = factory.newXMLSignature(signedInfo, keyInfo, null, "SIG-" + suffix, null);
            DOMSignContext context = new DOMSignContext(keys.privateKey(), security);
            context.setDefaultNamespacePrefix("ds");
            context.setIdAttributeNS(envelope.to(), WSU_NS, "Id");
            signature.sign(context);
        } catch (Exception e) {
            throw new SigningException("WS-Security signature failed: " + e.getMessage(), e);
        }
    }

    private static Element append(Element parent, Element child) {
        parent.appendChild(child);
        return child;
    }
}
