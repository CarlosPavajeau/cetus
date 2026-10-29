package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.cache.Cache;
import com.cantte.cetus.cache.Caches;
import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.Pkcs12Loader;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.Arrays;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Keeps decrypted certificates in memory for a few minutes, so KMS and S3 are not hit on
 * every document. Keys are only ever held in memory, never written to disk.
 *
 * <p>Jobs run concurrently: when several of one issuer find its certificate missing or expired, one loads it
 * and the rest wait for it, instead of each paying a KMS call and the PKCS#12 key derivation.
 */
@ApplicationScoped
public class KeyMaterialCache {

    private final Cache<Identity, KeyMaterial> cache;

    public KeyMaterialCache(
            Caches caches,
            @ConfigProperty(name = "cetus.cache.certificates.max-entries", defaultValue = "512") int capacity) {
        cache = caches.local(capacity, Duration.ofMinutes(10));
    }

    @Inject
    DocumentStorage storage;

    @Inject
    SecretCipher cipher;

    public KeyMaterial get(ProcessingContext.CertificateRef ref) {
        Identity identity = new Identity(
                ref.id(),
                ref.s3Key(),
                ref.passwordS3Key(),
                ref.passwordSealed() == null ? null : SealedFingerprint.of(ref.passwordSealed()));
        return cache.get(identity, () -> {
            byte[] pkcs12 = cipher.open(storage.get(ref.s3Key()));
            byte[] passwordSealed =
                    ref.passwordSealed() != null ? ref.passwordSealed() : storage.get(ref.passwordS3Key());
            char[] password = cipher.openText(passwordSealed).toCharArray();
            try {
                return Pkcs12Loader.load(pkcs12, password);
            } finally {
                Arrays.fill(password, '\0');
                Arrays.fill(pkcs12, (byte) 0);
            }
        });
    }

    private record Identity(UUID id, String s3Key, String passwordS3Key, String passwordFingerprint) {}
}
