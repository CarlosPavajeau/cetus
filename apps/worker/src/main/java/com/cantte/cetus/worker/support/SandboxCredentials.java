package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.dian.Hashing;
import com.cantte.cetus.worker.builders.DocumentSecrets;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * What a SANDBOX document is built and signed with, in place of its issuer's own credentials: a Software
 * ID, PIN and technical key that are not secret, and Cetus' self-signed sandbox certificate, stored in S3
 * and sealed like the issuers' certificates. Sandbox issuers keep none of their own.
 *
 * <p>Every account's sample issuer has the same NIT and numbering, so the PIN and the technical key are
 * derived per issuer: with shared ones, two accounts issuing the same invoice in the same second would get
 * the same CUFE, which must be unique.
 */
@ApplicationScoped
public class SandboxCredentials {

    /** Caches the sandbox certificate under one id, like any other in {@link KeyMaterialCache}. */
    private static final UUID CERTIFICATE_ID = UUID.fromString("00000000-0000-4000-8000-5a4db0c00001");

    @ConfigProperty(name = "cetus.sandbox.software-id")
    String softwareId;

    @ConfigProperty(name = "cetus.sandbox.pin")
    String pin;

    @ConfigProperty(name = "cetus.sandbox.technical-key")
    String technicalKey;

    @ConfigProperty(name = "cetus.sandbox.certificate.s3-key")
    String certificateKey;

    @ConfigProperty(name = "cetus.sandbox.certificate.password-s3-key")
    String passwordKey;

    public String softwareId() {
        return softwareId;
    }

    /** A five-digit PIN and a 40-character technical key of the issuer's own, from the configured ones. */
    public DocumentSecrets secrets(UUID issuerId) {
        String issuerPin =
                String.valueOf(10_000 + Integer.parseInt(derive(pin, issuerId).substring(0, 7), 16) % 90_000);
        return new DocumentSecrets(issuerPin, derive(technicalKey, issuerId).substring(0, 40));
    }

    /** The password is read from S3 with the certificate, so both change together when they are replaced. */
    public ProcessingContext.CertificateRef certificate() {
        return new ProcessingContext.CertificateRef(CERTIFICATE_ID, certificateKey, null, passwordKey);
    }

    private static String derive(String value, UUID issuerId) {
        return Hashing.sha384Hex(value + ":" + issuerId);
    }
}
