package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.Pkcs12Loader;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Keeps decrypted certificates in memory for a few minutes, so KMS and S3 are not hit on
 * every document. Keys are only ever held in memory, never written to disk.
 */
@ApplicationScoped
public class KeyMaterialCache {

    private static final Duration TTL = Duration.ofMinutes(10);
    private final Map<UUID, Entry> cache = new ConcurrentHashMap<>();

    @Inject
    DocumentStorage storage;
    @Inject
    SecretCipher cipher;

    public KeyMaterial get(ProcessingContext.CertificateRef ref) {
        Entry entry = cache.get(ref.id());
        if (entry != null && entry.loadedAt().plus(TTL).isAfter(Instant.now())) {
            return entry.keys();
        }
        byte[] pkcs12 = cipher.open(storage.get(ref.s3Key()));
        char[] password = cipher.openText(ref.passwordSealed()).toCharArray();
        KeyMaterial keys = Pkcs12Loader.load(pkcs12, password);
        cache.put(ref.id(), new Entry(keys, Instant.now()));
        return keys;
    }

    private record Entry(KeyMaterial keys, Instant loadedAt) {
    }
}
