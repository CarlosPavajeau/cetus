package com.cantte.cetus.cache;

import java.time.Duration;

/**
 * Entries expire {@code ttl} after they are loaded; past {@code capacity}, the least recently used goes first.
 * {@code name} identifies the cache in metrics, from a closed list of low-cardinality values.
 */
public interface Caches {

    /** A cache that never leaves this process, the only kind fit for decrypted secrets. */
    <K, V> Cache<K, V> local(String name, int capacity, Duration ttl);

    /**
     * A cache that replicas may share once a shared store backs it, so {@code valueType} must round-trip through
     * JSON: a record of plain values, or a plain value. Each replica sees another's invalidation only when the store
     * is shared; until then, {@code ttl} bounds how long it keeps a stale value.
     */
    <V> Cache<String, V> shared(String name, int capacity, Duration ttl, Class<V> valueType);
}
