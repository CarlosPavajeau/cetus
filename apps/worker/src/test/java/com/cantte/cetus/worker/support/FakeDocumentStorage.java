package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.domain.dian.Hashing;
import io.quarkus.test.Mock;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** In-memory S3 that remembers which objects were written with a retention. */
@Mock
@ApplicationScoped
public class FakeDocumentStorage extends DocumentStorage {

    private final Map<String, byte[]> objects = new ConcurrentHashMap<>();
    private final Set<String> retained = ConcurrentHashMap.newKeySet();

    @Override
    public StoredObject put(String key, byte[] content, String contentType) {
        objects.put(key, content.clone());
        return new StoredObject(key, Hashing.sha256Hex(content), content.length, contentType);
    }

    @Override
    public StoredObject putRetained(String key, byte[] content, String contentType) {
        retained.add(key);
        return put(key, content, contentType);
    }

    public boolean isRetained(String key) {
        return retained.contains(key);
    }

    @Override
    public byte[] get(String key) {
        return objects.get(key).clone();
    }
}
