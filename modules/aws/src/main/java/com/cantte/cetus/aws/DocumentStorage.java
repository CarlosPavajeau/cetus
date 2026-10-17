package com.cantte.cetus.aws;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;

import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Immutable document storage on S3. Enable Object Lock (compliance mode) on the bucket so
 * signed XML and DIAN responses cannot be altered or deleted during the retention period.
 */
@ApplicationScoped
public class DocumentStorage {

    @Inject
    S3Client s3;

    @ConfigProperty(name = "cetus.storage.bucket")
    String bucket;

    public StoredObject put(String key, byte[] content, String contentType) {
        s3.putObject(r -> r.bucket(bucket).key(key).contentType(contentType), RequestBody.fromBytes(content));
        return new StoredObject(key, sha256(content), content.length, contentType);
    }

    public byte[] get(String key) {
        return s3.getObjectAsBytes(r -> r.bucket(bucket).key(key)).asByteArray();
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public record StoredObject(String key, String sha256, long size, String contentType) {
    }
}
