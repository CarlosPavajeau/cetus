package com.cantte.cetus.dianmock;

import java.io.ByteArrayInputStream;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import javax.xml.crypto.dsig.Reference;
import javax.xml.crypto.dsig.XMLSignature;
import javax.xml.crypto.dsig.XMLSignatureFactory;
import javax.xml.crypto.dsig.dom.DOMValidateContext;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

/**
 * Checks the WS-Security header the way the DIAN does, except for the certificate chain:
 * any certificate is accepted (unless configured otherwise), so self-signed ones work locally.
 * The DIAN answers every failure here with the same reason-less {@code s:Client} fault; the mock
 * returns that same fault but logs the actual problem.
 */
final class WsSecurityVerifier {

    static final String WSSE_NS = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd";
    static final String WSU_NS = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd";
    private static final Duration CLOCK_SKEW = Duration.ofMinutes(5);

    record Result(String problem, X509Certificate certificate) {
        boolean ok() {
            return problem == null;
        }

        boolean selfSigned() {
            return certificate != null
                    && certificate.getSubjectX500Principal().equals(certificate.getIssuerX500Principal());
        }
    }

    private final Clock clock;

    WsSecurityVerifier(Clock clock) {
        this.clock = clock;
    }

    Result verify(Document envelope) {
        Element security = first(envelope.getDocumentElement(), WSSE_NS, "Security");
        if (security == null) {
            return fail("missing wsse:Security header");
        }

        Element expires = first(security, WSU_NS, "Expires");
        Element created = first(security, WSU_NS, "Created");
        if (expires == null || created == null) {
            return fail("missing wsu:Timestamp with Created/Expires");
        }
        Instant now = clock.instant();
        try {
            if (now.isAfter(Instant.parse(expires.getTextContent().trim()).plus(CLOCK_SKEW))) {
                return fail(
                        "wsu:Timestamp expired at " + expires.getTextContent().trim());
            }
            if (Instant.parse(created.getTextContent().trim()).isAfter(now.plus(CLOCK_SKEW))) {
                return fail("wsu:Timestamp created in the future: "
                        + created.getTextContent().trim());
            }
        } catch (RuntimeException e) {
            return fail("unparseable wsu:Timestamp: " + e.getMessage());
        }

        Element token = first(security, WSSE_NS, "BinarySecurityToken");
        if (token == null) {
            return fail("missing wsse:BinarySecurityToken");
        }
        X509Certificate certificate;
        try {
            byte[] der = Base64.getMimeDecoder().decode(token.getTextContent().trim());
            certificate = (X509Certificate)
                    CertificateFactory.getInstance("X.509").generateCertificate(new ByteArrayInputStream(der));
        } catch (Exception e) {
            return fail("BinarySecurityToken is not an X.509 certificate: " + e.getMessage());
        }
        try {
            certificate.checkValidity();
        } catch (Exception e) {
            return new Result(
                    "certificate not valid now (" + certificate.getNotBefore() + " - " + certificate.getNotAfter()
                            + ")",
                    certificate);
        }

        Element signature = first(security, XMLSignature.XMLNS, "Signature");
        Element to = first(envelope.getDocumentElement(), Soap.WSA_NS, "To");
        if (signature == null) {
            return new Result("missing ds:Signature in wsse:Security", certificate);
        }
        if (to == null || to.getAttributeNS(WSU_NS, "Id").isEmpty()) {
            return new Result("missing wsa:To header with wsu:Id", certificate);
        }
        try {
            DOMValidateContext context = new DOMValidateContext(certificate.getPublicKey(), signature);
            context.setIdAttributeNS(to, WSU_NS, "Id");
            XMLSignature xmlSignature = XMLSignatureFactory.getInstance("DOM").unmarshalXMLSignature(context);
            String toUri = "#" + to.getAttributeNS(WSU_NS, "Id");
            boolean coversTo = xmlSignature.getSignedInfo().getReferences().stream()
                    .anyMatch(reference -> toUri.equals(((Reference) reference).getURI()));
            if (!coversTo) {
                return new Result("signature does not reference wsa:To (" + toUri + ")", certificate);
            }
            if (!xmlSignature.validate(context)) {
                boolean valueOk = xmlSignature.getSignatureValue().validate(context);
                return new Result(
                        valueOk
                                ? "digest of wsa:To does not match (header altered after signing?)"
                                : "signature value does not match the certificate's public key",
                        certificate);
            }
        } catch (Exception e) {
            return new Result("invalid ds:Signature: " + e.getMessage(), certificate);
        }
        return new Result(null, certificate);
    }

    private static Result fail(String problem) {
        return new Result(problem, null);
    }

    private static Element first(Element parent, String namespace, String localName) {
        NodeList nodes = parent.getElementsByTagNameNS(namespace, localName);
        return nodes.getLength() == 0 ? null : (Element) nodes.item(0);
    }
}
