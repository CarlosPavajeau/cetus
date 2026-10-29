package com.cantte.cetus.cache;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Supplier;

final class InstrumentedCache<K, V> implements Cache<K, V> {

    private final Cache<K, V> delegate;
    private final Counter hits;
    private final Counter misses;
    private final Counter loadErrors;

    InstrumentedCache(Cache<K, V> delegate, String name, MeterRegistry meters) {
        this.delegate = delegate;
        this.hits = requests(meters, name, "hit");
        this.misses = requests(meters, name, "miss");
        this.loadErrors = requests(meters, name, "load_error");
    }

    @Override
    public Optional<V> find(K key, Supplier<Optional<V>> loader) {
        var loaded = new AtomicBoolean();
        Optional<V> value = delegate.find(key, () -> {
            loaded.set(true);
            try {
                return loader.get();
            } catch (RuntimeException e) {
                loadErrors.increment();
                throw e;
            }
        });
        (loaded.get() ? misses : hits).increment();
        return value;
    }

    @Override
    public void invalidate(K key) {
        delegate.invalidate(key);
    }

    @Override
    public void invalidateAll() {
        delegate.invalidateAll();
    }

    private static Counter requests(MeterRegistry meters, String name, String outcome) {
        return Counter.builder("cetus.cache.requests")
                .description("Cache lookups by outcome; a miss loads the value from its source")
                .tag("cache.name", name)
                .tag("outcome", outcome)
                .register(meters);
    }
}
