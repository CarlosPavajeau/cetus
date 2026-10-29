package com.cantte.cetus.cache;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

final class LocalCache<K, V> implements Cache<K, V> {
    private final Map<K, Entry<V>> entries = new LinkedHashMap<>(16, 0.75f, true);
    private final ReentrantLock[] loading = new ReentrantLock[64];
    private final int capacity;
    private final Duration ttl;
    private final Supplier<Instant> now;

    LocalCache(int capacity, Duration ttl, Supplier<Instant> now) {
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

    @Override
    public Optional<V> find(K key, Supplier<Optional<V>> loader) {
        V value = fresh(key);
        if (value != null) {
            return Optional.of(value);
        }
        ReentrantLock lock = lockFor(key);
        lock.lock();
        try {
            value = fresh(key);
            if (value != null) {
                return Optional.of(value);
            }
            Optional<V> loaded = loader.get();
            loaded.ifPresent(found -> {
                synchronized (entries) {
                    entries.put(key, new Entry<>(found, now.get().plus(ttl)));
                    while (entries.size() > capacity) {
                        entries.remove(entries.keySet().iterator().next());
                    }
                }
            });
            return loaded;
        } finally {
            lock.unlock();
        }
    }

    @Override
    public void invalidate(K key) {
        ReentrantLock lock = lockFor(key);
        lock.lock();
        try {
            synchronized (entries) {
                entries.remove(key);
            }
        } finally {
            lock.unlock();
        }
    }

    @Override
    public void invalidateAll() {
        for (ReentrantLock lock : loading) {
            lock.lock();
        }
        try {
            synchronized (entries) {
                entries.clear();
            }
        } finally {
            for (ReentrantLock lock : loading) {
                lock.unlock();
            }
        }
    }

    private ReentrantLock lockFor(K key) {
        return loading[Math.floorMod(key.hashCode(), loading.length)];
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
