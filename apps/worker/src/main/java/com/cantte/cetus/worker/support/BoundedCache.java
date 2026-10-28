package com.cantte.cetus.worker.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

final class BoundedCache<K, V> {
    private final Map<K, Entry<V>> entries = new LinkedHashMap<>(16, 0.75f, true);
    private final ReentrantLock[] loading = new ReentrantLock[64];
    private final int capacity;
    private final Duration ttl;
    private final Supplier<Instant> now;

    BoundedCache(int capacity, Duration ttl, Supplier<Instant> now) {
        if (capacity < 1 || ttl.isNegative() || ttl.isZero()) {
            throw new IllegalArgumentException("Cache capacity and TTL must be positive");
        }
        this.capacity = capacity;
        this.ttl = ttl;
        this.now = now;
        for (int i = 0; i < loading.length; i++) {
            loading[i] = new ReentrantLock();
        }
    }

    BoundedCache(int capacity) {
        this(capacity, Duration.ofMinutes(10), Clock.systemUTC()::instant);
    }

    V get(K key, Supplier<V> loader) {
        V value = fresh(key);
        if (value != null) {
            return value;
        }
        ReentrantLock lock = loading[Math.floorMod(key.hashCode(), loading.length)];
        lock.lock();
        try {
            value = fresh(key);
            if (value == null) {
                value = Objects.requireNonNull(loader.get());
                synchronized (entries) {
                    entries.put(key, new Entry<>(value, now.get().plus(ttl)));
                    while (entries.size() > capacity) {
                        entries.remove(entries.keySet().iterator().next());
                    }
                }
            }
            return value;
        } finally {
            lock.unlock();
        }
    }

    private V fresh(K key) {
        synchronized (entries) {
            Entry<V> entry = entries.get(key);
            if (entry == null) {
                return null;
            }
            if (!entry.expiresAt().isAfter(now.get())) {
                entries.remove(key);
                return null;
            }
            return entry.value();
        }
    }

    void cleanUp() {
        synchronized (entries) {
            Instant instant = now.get();
            entries.values().removeIf(entry -> !entry.expiresAt().isAfter(instant));
        }
    }

    int size() {
        synchronized (entries) {
            return entries.size();
        }
    }

    private record Entry<V>(V value, Instant expiresAt) {}
}
