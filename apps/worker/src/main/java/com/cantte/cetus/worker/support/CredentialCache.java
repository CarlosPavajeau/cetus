package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.cache.Cache;
import com.cantte.cetus.cache.Caches;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class CredentialCache {
    private final Cache<String, String> cache;

    @Inject
    SecretCipher cipher;

    public CredentialCache(
            Caches caches,
            @ConfigProperty(name = "cetus.cache.credentials.max-entries", defaultValue = "1024") int capacity) {
        cache = caches.local(capacity, Duration.ofMinutes(10));
    }

    public String open(byte[] sealed) {
        return cache.get(SealedFingerprint.of(sealed), () -> cipher.openText(sealed));
    }
}
