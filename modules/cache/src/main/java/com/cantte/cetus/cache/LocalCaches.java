package com.cantte.cetus.cache;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Supplier;

/** Every cache in this process's memory, shared ones included until a shared store backs them. */
@ApplicationScoped
public class LocalCaches implements Caches {

    private final List<LocalCache<?, ?>> created = new CopyOnWriteArrayList<>();
    private final MeterRegistry meters;
    private final Supplier<Instant> now;

    @Inject
    public LocalCaches(MeterRegistry meters) {
        this(meters, Clock.systemUTC()::instant);
    }

    public LocalCaches(MeterRegistry meters, Supplier<Instant> now) {
        this.meters = meters;
        this.now = now;
    }

    @Override
    public <K, V> Cache<K, V> local(String name, int capacity, Duration ttl) {
        LocalCache<K, V> cache = create(capacity, ttl);
        Gauge.builder("cetus.cache.size", cache, LocalCache::size)
                .description("Entries held in this process's memory")
                .tag("cache.name", name)
                .register(meters);
        return new InstrumentedCache<>(cache, name, meters);
    }

    @Override
    public <V> Cache<String, V> shared(String name, int capacity, Duration ttl, Class<V> valueType) {
        return local(name, capacity, ttl);
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
