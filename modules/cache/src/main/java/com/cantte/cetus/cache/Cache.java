package com.cantte.cetus.cache;

import java.util.Optional;
import java.util.function.Supplier;

public interface Cache<K, V> {

    /**
     * Returns the cached value, or loads it and caches it when present. Concurrent misses on one key load it
     * once. A loader that throws or finds nothing caches nothing, so the next call loads again.
     */
    Optional<V> find(K key, Supplier<Optional<V>> loader);

    /** Like {@link #find}, for values that always exist: a loader that returns null throws. */
    default V get(K key, Supplier<V> loader) {
        return find(key, () -> Optional.of(loader.get())).orElseThrow();
    }

    /** Call it after the change is committed: a load in progress for the key finishes before it is removed. */
    void invalidate(K key);

    void invalidateAll();
}
