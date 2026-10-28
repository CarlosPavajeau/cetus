package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.SecretCipher;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class CredentialCache {
    private final BoundedCache<String, String> cache;

    @Inject
    SecretCipher cipher;

    public CredentialCache(
            @ConfigProperty(name = "cetus.cache.credentials.max-entries", defaultValue = "1024") int capacity) {
        cache = new BoundedCache<>(capacity);
    }

    public String open(byte[] sealed) {
        return cache.get(SealedFingerprint.of(sealed), () -> cipher.openText(sealed));
    }

    @Scheduled(every = "1m")
    void cleanUp() {
        cache.cleanUp();
    }
}
