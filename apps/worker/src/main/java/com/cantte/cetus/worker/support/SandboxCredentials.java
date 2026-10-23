package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.worker.builders.DocumentSecrets;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.UUID;

/**
 * What a SANDBOX document is built and signed with, in place of its issuer's own credentials: a Software
 * ID, PIN and technical key that are not secret, and Cetus' self-signed sandbox certificate, stored in S3
 * and sealed like the issuers' certificates. Sandbox issuers keep none of their own.
 */
@ApplicationScoped
public class SandboxCredentials {

    /** Caches the sandbox certificate under one id, like any other in {@link KeyMaterialCache}. */
    private static final UUID CERTIFICATE_ID = UUID.fromString("00000000-0000-4000-8000-5a4db0c00001");

    @Inject
    DocumentStorage storage;

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

    private volatile byte[] passwordSealed;

    public String softwareId() {
        return softwareId;
    }

    public DocumentSecrets secrets() {
        return new DocumentSecrets(pin, technicalKey);
    }

    /** The sealed password is read from S3 once; the certificate itself loads through the key cache. */
    public ProcessingContext.CertificateRef certificate() {
        byte[] password = passwordSealed;
        if (password == null) {
            password = storage.get(passwordKey);
            passwordSealed = password;
        }
        return new ProcessingContext.CertificateRef(CERTIFICATE_ID, certificateKey, password);
    }
}
