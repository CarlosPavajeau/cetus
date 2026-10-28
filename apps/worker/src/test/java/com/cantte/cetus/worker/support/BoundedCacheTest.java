package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class BoundedCacheTest {
    @Test
    void expiresWithoutAccessAndEvictsLeastRecentlyUsed() {
        var now = new AtomicReference<>(Instant.EPOCH);
        var cache = new BoundedCache<String, String>(2, Duration.ofMinutes(10), now::get);
        cache.get("a", () -> "first");
        cache.get("b", () -> "second");
        cache.get("a", () -> "unexpected");
        cache.get("c", () -> "third");
        assertThat(cache.size()).isEqualTo(2);
        assertThat(cache.get("a", () -> "unexpected")).isEqualTo("first");
        assertThat(cache.get("b", () -> "reloaded")).isEqualTo("reloaded");
        now.set(Instant.EPOCH.plus(Duration.ofMinutes(10)));
        cache.cleanUp();
        assertThat(cache.size()).isZero();
        assertThat(cache.get("a", () -> "expired")).isEqualTo("expired");
    }

    @Test
    void concurrentMissesLoadOnceAndOtherKeysRemainAccessible() throws Exception {
        var cache = new BoundedCache<Integer, String>(256);
        var loads = new AtomicInteger();
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> cache.get(1, () -> {
                loads.incrementAndGet();
                entered.countDown();
                try {
                    if (!release.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Loader timed out");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(e);
                }
                return "secret";
            }));
            try {
                assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(executor.submit(() -> cache.get(2, () -> "other")).get(5, TimeUnit.SECONDS))
                        .isEqualTo("other");
                var ready = new CountDownLatch(32);
                var waiting = new ArrayList<Future<String>>();
                for (int i = 0; i < 32; i++) {
                    waiting.add(executor.submit(() -> {
                        ready.countDown();
                        return cache.get(1, () -> {
                            loads.incrementAndGet();
                            return "duplicate";
                        });
                    }));
                }
                assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
                release.countDown();
                assertThat(first.get(5, TimeUnit.SECONDS)).isEqualTo("secret");
                for (var result : waiting)
                    assertThat(result.get(5, TimeUnit.SECONDS)).isEqualTo("secret");
                assertThat(loads).hasValue(1);
            } finally {
                release.countDown();
            }
        }
    }

    @Test
    void errorsAndIncompleteValuesAllowRetry() {
        var cache = new BoundedCache<String, String>(256);
        assertThatThrownBy(() -> cache.get("key", () -> {
                    throw new IllegalStateException("KMS unavailable");
                }))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> cache.get("key", () -> null)).isInstanceOf(NullPointerException.class);
        assertThat(cache.size()).isZero();
        assertThat(cache.get("key", () -> "retried")).isEqualTo("retried");
    }

    @Test
    void moreThan256IdentitiesRemainBounded() {
        var cache = new BoundedCache<Integer, String>(256);
        for (int i = 0; i < 1000; i++) cache.get(i, () -> "secret");
        assertThat(cache.size()).isEqualTo(256);
    }
}
