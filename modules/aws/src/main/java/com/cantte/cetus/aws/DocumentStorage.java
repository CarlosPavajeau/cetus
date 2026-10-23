package com.cantte.cetus.aws;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectsResponse;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;
import software.amazon.awssdk.services.s3.model.ObjectLockMode;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URL;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Document storage on S3. Signed documents and DIAN responses go through {@link #putRetained}, which
 * locks each object in Object Lock compliance mode for {@code cetus.storage.retention-days}: nobody, not
 * even the account root, can alter or delete it before then. The bucket must be created with Object Lock
 * enabled and without a default retention, so other objects (sealed certificates) stay replaceable.
 */
@ApplicationScoped
public class DocumentStorage {

    @Inject
    S3Client s3;
    @Inject
    S3Presigner presigner;

    @ConfigProperty(name = "cetus.storage.bucket")
    String bucket;
    /** Empty: objects are not locked (development, tests and buckets without Object Lock). */
    @ConfigProperty(name = "cetus.storage.retention-days")
    Optional<Integer> retentionDays;

    public StoredObject put(String key, byte[] content, String contentType) {
        return put(key, content, contentType, false);
    }

    /** Stores an object that must be kept unaltered for the retention period. */
    public StoredObject putRetained(String key, byte[] content, String contentType) {
        return put(key, content, contentType, true);
    }

    private StoredObject put(String key, byte[] content, String contentType, boolean retain) {
        byte[] digest = sha256(content);
        PutObjectRequest.Builder request = PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType);
        if (retain && retentionDays.isPresent()) {
            // S3 requires an integrity checksum on writes that set a retention.
            request.objectLockMode(ObjectLockMode.COMPLIANCE)
                    .objectLockRetainUntilDate(Instant.now().plus(Duration.ofDays(retentionDays.get())))
                    .checksumSHA256(Base64.getEncoder().encodeToString(digest));
        }
        s3.putObject(request.build(), RequestBody.fromBytes(content));
        return new StoredObject(key, HexFormat.of().formatHex(digest), content.length, contentType);
    }

    public byte[] get(String key) {
        return s3.getObjectAsBytes(r -> r.bucket(bucket).key(key)).asByteArray();
    }

    /**
     * Deletes objects that were stored without a retention (a locked one cannot be deleted before its date).
     * Up to 1000 keys per call, S3's limit for one request. S3 answers a request that deleted only some of
     * them with the others' errors, which are thrown here naming each key.
     */
    public void delete(List<String> keys) {
        if (keys.isEmpty()) {
            return;
        }
        List<ObjectIdentifier> objects = keys.stream().map(key -> ObjectIdentifier.builder().key(key).build()).toList();
        DeleteObjectsResponse response = s3.deleteObjects(r -> r.bucket(bucket).delete(d -> d.objects(objects).quiet(true)));
        if (response.hasErrors() && !response.errors().isEmpty()) {
            throw new IllegalStateException("Could not delete " + response.errors().size() + " objects: "
                    + response.errors().stream().map(error -> error.key() + " (" + error.code() + ")")
                    .collect(Collectors.joining(", ")));
        }
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

    private static byte[] sha256(byte[] content) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(content);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public record StoredObject(String key, String sha256, long size, String contentType) {
    }

    public record PresignedUrl(String url, Instant expiresAt) {
    }
}
