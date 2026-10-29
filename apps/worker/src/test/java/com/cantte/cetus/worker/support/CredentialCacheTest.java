package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.cache.LocalCaches;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.ArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class CredentialCacheTest {
    @Test
    void reusesBySealedContentAndReloadsOnRotation() throws Exception {
        var cache = new CredentialCache(new LocalCaches(new SimpleMeterRegistry()), 256);
        var cipher = new CountingCipher();
        cache.cipher = cipher;
        byte[] original = {1, 2};
        byte[] rotated = {3, 4};

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var results = new ArrayList<Future<String>>();
            for (int i = 0; i < 32; i++) results.add(executor.submit(() -> cache.open(original.clone())));
            for (var result : results) assertThat(result.get()).isEqualTo("1");
        }
        assertThat(cache.open(rotated)).isEqualTo("3");
        assertThat(cipher.calls).hasValue(2);
    }

    @Test
    void kmsFailureIsPropagatedAndRetried() {
        var cache = new CredentialCache(new LocalCaches(new SimpleMeterRegistry()), 256);
        var cipher = new CountingCipher();
        cache.cipher = cipher;
        byte[] sealed = {5};
        cipher.fail = true;
        assertThatThrownBy(() -> cache.open(sealed)).isInstanceOf(IllegalStateException.class);
        cipher.fail = false;
        assertThat(cache.open(sealed)).isEqualTo("5");
        assertThat(cipher.calls).hasValue(2);
    }

    private static class CountingCipher extends SecretCipher {
        final AtomicInteger calls = new AtomicInteger();
        boolean fail;

        @Override
        public String openText(byte[] sealed) {
            calls.incrementAndGet();
            if (fail) throw new IllegalStateException("KMS unavailable");
            return Byte.toString(sealed[0]);
        }
    }
}
