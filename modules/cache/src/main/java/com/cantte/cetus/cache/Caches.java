package com.cantte.cetus.cache;

import java.time.Duration;

public interface Caches {

    /**
     * A cache that never leaves this process, the only kind fit for decrypted secrets. Entries expire
     * {@code ttl} after they are loaded; past {@code capacity}, the least recently used goes first.
     */
    <K, V> Cache<K, V> local(int capacity, Duration ttl);
}
