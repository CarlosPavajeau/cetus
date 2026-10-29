package com.cantte.cetus.cache;

import java.util.function.Supplier;

public interface Cache<K, V> {

    /**
     * Returns the cached value, or loads and caches it. Concurrent misses on one key load it once. A loader
     * that throws or returns null caches nothing, so the next call retries.
     */
    V get(K key, Supplier<V> loader);

    /** Call it after the change is committed: a load in progress for the key finishes before it is removed. */
    void invalidate(K key);

    void invalidateAll();
}
