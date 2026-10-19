package com.cantte.cetus.aws;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URL;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

/**
 * Immutable document storage on S3. Enable Object Lock (compliance mode) on the bucket so
 * signed XML and DIAN responses cannot be altered or deleted during the retention period.
 */
@ApplicationScoped
public class DocumentStorage {

    @Inject
    S3Client s3;
    @Inject
    S3Presigner presigner;

    @ConfigProperty(name = "cetus.storage.bucket")
    String bucket;

    public StoredObject put(String key, byte[] content, String contentType) {
        s3.putObject(r -> r.bucket(bucket).key(key).contentType(contentType), RequestBody.fromBytes(content));
        return new StoredObject(key, sha256(content), content.length, contentType);
    }

    public byte[] get(String key) {
        return s3.getObjectAsBytes(r -> r.bucket(bucket).key(key)).asByteArray();
    }

    /**
     * A URL that downloads the object for {@code ttl} without credentials, so files never pass through
     * the API. The browser saves it as {@code downloadName}.
     */
    public PresignedUrl presignGet(String key, Duration ttl, String downloadName) {
        URL url = presigner.presignGetObject(r -> r.signatureDuration(ttl)
                .getObjectRequest(get -> get.bucket(bucket).key(key)
                        .responseContentDisposition("attachment; filename=\"" + downloadName + "\""))).url();
        return new PresignedUrl(url.toString(), Instant.now().plus(ttl));
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

    public record PresignedUrl(String url, Instant expiresAt) {
    }
}
