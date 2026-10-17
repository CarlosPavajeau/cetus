package com.cantte.cetus.signing;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.crypto.dom.DOMStructure;
import javax.xml.crypto.dsig.CanonicalizationMethod;
import javax.xml.crypto.dsig.DigestMethod;
import javax.xml.crypto.dsig.Reference;
import javax.xml.crypto.dsig.SignatureMethod;
import javax.xml.crypto.dsig.SignedInfo;
import javax.xml.crypto.dsig.Transform;
import javax.xml.crypto.dsig.XMLObject;
import javax.xml.crypto.dsig.XMLSignature;
import javax.xml.crypto.dsig.XMLSignatureFactory;
import javax.xml.crypto.dsig.dom.DOMSignContext;
import javax.xml.crypto.dsig.keyinfo.KeyInfo;
import javax.xml.crypto.dsig.keyinfo.KeyInfoFactory;
import javax.xml.crypto.dsig.keyinfo.X509Data;
import javax.xml.crypto.dsig.spec.C14NMethodParameterSpec;
import javax.xml.crypto.dsig.spec.TransformParameterSpec;
import java.security.MessageDigest;
import java.security.cert.X509Certificate;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * XAdES-EPES enveloped signature following the DIAN signature policy (v2).
 *
 * <p>The signature is appended to {@code target}, which must be the empty
 * {@code ext:ExtensionContent} of the second UBL extension. It signs three references:
 * the whole document (enveloped), the KeyInfo and the XAdES SignedProperties.
 *
 * <p>Policy identifier, description and hash are taken from the DIAN documentation;
 * confirm them against the current technical annex.
 */
public final class XadesSigner {

    public static final String XADES_NS = "http://uri.etsi.org/01903/v1.3.2#";
    public static final String DS_NS = XMLSignature.XMLNS;

    static final String POLICY_ID = "https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf";
    static final String POLICY_DESCRIPTION = "Política de firma para facturas electrónicas de la República de Colombia.";
    static final String POLICY_HASH = "dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=";
    private static final String SIGNED_PROPERTIES_TYPE = "http://uri.etsi.org/01903#SignedProperties";

    private final Clock clock;

    public XadesSigner() {
        this(Clock.systemUTC());
    }

    public XadesSigner(Clock clock) {
        this.clock = clock;
    }

    public void sign(Document document, Element target, KeyMaterial keys, SignerRole role) {
        try {
            XMLSignatureFactory factory = XMLSignatureFactory.getInstance("DOM");
            String id = "xmlsig-" + UUID.randomUUID();
            String keyInfoId = id + "-keyinfo";
            String signedPropsId = id + "-signedprops";

            DigestMethod sha256 = factory.newDigestMethod(DigestMethod.SHA256, null);
            Transform enveloped = factory.newTransform(Transform.ENVELOPED, (TransformParameterSpec) null);

            Reference documentRef = factory.newReference("", sha256, List.of(enveloped), null, id + "-ref0");
            Reference keyInfoRef = factory.newReference("#" + keyInfoId, sha256);
            Reference signedPropsRef = factory.newReference("#" + signedPropsId, sha256, null,
                    SIGNED_PROPERTIES_TYPE, null);

            SignedInfo signedInfo = factory.newSignedInfo(
                    factory.newCanonicalizationMethod(CanonicalizationMethod.INCLUSIVE, (C14NMethodParameterSpec) null),
                    factory.newSignatureMethod(SignatureMethod.RSA_SHA256, null),
                    List.of(documentRef, keyInfoRef, signedPropsRef));

            KeyInfoFactory keyInfoFactory = factory.getKeyInfoFactory();
            X509Data x509Data = keyInfoFactory.newX509Data(List.copyOf(keys.chain()));
            KeyInfo keyInfo = keyInfoFactory.newKeyInfo(List.of(x509Data), keyInfoId);

            Element qualifyingProperties = qualifyingProperties(document, id, signedPropsId, keys.certificate(), role);
            Element signedProperties = (Element) qualifyingProperties.getFirstChild();
            XMLObject xadesObject = factory.newXMLObject(List.of(new DOMStructure(qualifyingProperties)), null, null, null);

            XMLSignature signature = factory.newXMLSignature(signedInfo, keyInfo, List.of(xadesObject), id, id + "-sigvalue");

            DOMSignContext context = new DOMSignContext(keys.privateKey(), target);
            context.setDefaultNamespacePrefix("ds");
            // The SignedProperties element lives inside the ds:Object; register its Id so it can be dereferenced.
            context.setIdAttributeNS(signedProperties, null, "Id");
            signature.sign(context);
        } catch (SigningException e) {
            throw e;
        } catch (Exception e) {
            throw new SigningException("XAdES signature failed: " + e.getMessage(), e);
        }
    }

    private Element qualifyingProperties(Document doc, String signatureId, String signedPropsId,
                                         X509Certificate certificate, SignerRole role) throws Exception {
        Element qp = xades(doc, "QualifyingProperties");
        // Explicit declarations so canonicalization of SignedProperties is deterministic.
        qp.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xades", XADES_NS);
        qp.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:ds", DS_NS);
        qp.setAttribute("Target", "#" + signatureId);

        Element signedProperties = append(qp, xades(doc, "SignedProperties"));
        signedProperties.setAttribute("Id", signedPropsId);
        Element ssp = append(signedProperties, xades(doc, "SignedSignatureProperties"));

        String signingTime = OffsetDateTime.now(clock).withOffsetSameInstant(ZoneOffset.ofHours(-5))
                .truncatedTo(ChronoUnit.SECONDS).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        append(ssp, xades(doc, "SigningTime")).setTextContent(signingTime);

        Element cert = append(append(ssp, xades(doc, "SigningCertificate")), xades(doc, "Cert"));
        Element certDigest = append(cert, xades(doc, "CertDigest"));
        appendDigest(doc, certDigest, Base64.getEncoder().encodeToString(
                MessageDigest.getInstance("SHA-256").digest(certificate.getEncoded())));
        Element issuerSerial = append(cert, xades(doc, "IssuerSerial"));
        append(issuerSerial, ds(doc, "X509IssuerName")).setTextContent(certificate.getIssuerX500Principal().getName());
        append(issuerSerial, ds(doc, "X509SerialNumber")).setTextContent(certificate.getSerialNumber().toString());

        Element policyId = append(append(ssp, xades(doc, "SignaturePolicyIdentifier")), xades(doc, "SignaturePolicyId"));
        Element sigPolicyId = append(policyId, xades(doc, "SigPolicyId"));
        append(sigPolicyId, xades(doc, "Identifier")).setTextContent(POLICY_ID);
        append(sigPolicyId, xades(doc, "Description")).setTextContent(POLICY_DESCRIPTION);
        appendDigest(doc, append(policyId, xades(doc, "SigPolicyHash")), POLICY_HASH);

        Element claimedRoles = append(append(ssp, xades(doc, "SignerRole")), xades(doc, "ClaimedRoles"));
        append(claimedRoles, xades(doc, "ClaimedRole")).setTextContent(role.value());
        return qp;
    }

    private static void appendDigest(Document doc, Element parent, String value) {
        Element method = append(parent, ds(doc, "DigestMethod"));
        method.setAttribute("Algorithm", DigestMethod.SHA256);
        append(parent, ds(doc, "DigestValue")).setTextContent(value);
    }

    private static Element xades(Document doc, String name) {
        return doc.createElementNS(XADES_NS, "xades:" + name);
    }

    private static Element ds(Document doc, String name) {
        return doc.createElementNS(DS_NS, "ds:" + name);
    }

    private static Element append(Element parent, Element child) {
        parent.appendChild(child);
        return child;
    }

    /** ClaimedRole: "supplier" for the issuer, "third party" when signing on its behalf. */
    public enum SignerRole {
        SUPPLIER("supplier"),
        THIRD_PARTY("third party");

        private final String value;

        SignerRole(String value) {
            this.value = value;
        }

        public String value() {
            return value;
        }
    }
}
