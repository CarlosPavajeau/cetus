package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.aws.SecretCipher;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

/**
 * Local runs only (development and the console's CI): LocalStack starts empty, so at startup the sandbox
 * certificate is sealed and stored from {@code cetus.sandbox.certificate.seed-file} when the bucket does not
 * have it yet. Production never sets the file: its certificate is uploaded once, by hand.
 */
@ApplicationScoped
public class SandboxCertificateSeed {

    private static final Logger LOG = Logger.getLogger(SandboxCertificateSeed.class);

    @Inject
    DocumentStorage storage;

    @Inject
    SecretCipher cipher;

    @ConfigProperty(name = "cetus.sandbox.certificate.s3-key")
    String certificateKey;

    @ConfigProperty(name = "cetus.sandbox.certificate.password-s3-key")
    String passwordKey;

    @ConfigProperty(name = "cetus.sandbox.certificate.seed-file")
    Optional<Path> seedFile;

    @ConfigProperty(name = "cetus.sandbox.certificate.seed-password")
    Optional<String> seedPassword;

    void seed(@Observes StartupEvent event) {
        if (seedFile.isEmpty() || seedPassword.isEmpty()) {
            return;
        }
        try {
            storage.get(passwordKey);
            return;
        } catch (NoSuchKeyException e) {
            // Not stored yet: seed it below.
        }
        Path file = seedFile.get().toAbsolutePath().normalize();
        byte[] pkcs12;
        try {
            pkcs12 = Files.readAllBytes(file);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read the sandbox certificate to seed: " + file, e);
        }
        storage.put(certificateKey, cipher.seal(pkcs12), "application/octet-stream");
        storage.put(passwordKey, cipher.sealText(seedPassword.get()), "application/octet-stream");
        LOG.infof("Sandbox certificate seeded from %s", file);
    }
}
