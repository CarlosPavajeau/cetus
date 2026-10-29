package com.cantte.cetus.cache;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Supplier;

@ApplicationScoped
public class LocalCaches implements Caches {

    private final List<LocalCache<?, ?>> created = new CopyOnWriteArrayList<>();
    private final Supplier<Instant> now;

    public LocalCaches() {
        this(Clock.systemUTC()::instant);
    }

    public LocalCaches(Supplier<Instant> now) {
        this.now = now;
    }

    @Override
    public <K, V> Cache<K, V> local(int capacity, Duration ttl) {
        return create(capacity, ttl);
    }

    <K, V> LocalCache<K, V> create(int capacity, Duration ttl) {
        LocalCache<K, V> cache = new LocalCache<>(capacity, ttl, now);
        created.add(cache);
        return cache;
    }

    @Scheduled(every = "1m")
    void cleanUp() {
        created.forEach(LocalCache::cleanUp);
    }
}
