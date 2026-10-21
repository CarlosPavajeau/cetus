package com.cantte.cetus.aws;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.localstack.LocalStackContainer;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRetentionResponse;
import software.amazon.awssdk.services.s3.model.ObjectLockRetentionMode;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Object Lock against LocalStack: retained documents cannot be deleted, other objects can. */
@Testcontainers
class DocumentStorageTest {

    private static final String BUCKET = "cetus-documents";

    @Container
    static final LocalStackContainer LOCALSTACK = new LocalStackContainer(DockerImageName.parse("localstack/localstack:3"))
            .withServices("s3");

    static S3Client s3;

    @BeforeAll
    static void createBucket() {
        s3 = S3Client.builder()
                .endpointOverride(LOCALSTACK.getEndpoint())
                .region(Region.of(LOCALSTACK.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(LOCALSTACK.getAccessKey(), LOCALSTACK.getSecretKey())))
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .forcePathStyle(true)
                .build();
        s3.createBucket(r -> r.bucket(BUCKET).objectLockEnabledForBucket(true));
    }

    @AfterAll
    static void close() {
        s3.close();
    }

    @Test
    void retainedObjectsAreLockedInComplianceMode() {
        DocumentStorage storage = storage(Optional.of(1826));
        Instant before = Instant.now();

        DocumentStorage.StoredObject stored = storage.putRetained("documents/test/1/signed.xml", bytes("<Invoice/>"), "application/xml");

        GetObjectRetentionResponse retention = s3.getObjectRetention(r -> r.bucket(BUCKET).key(stored.key()));
        assertThat(retention.retention().mode()).isEqualTo(ObjectLockRetentionMode.COMPLIANCE);
        assertThat(retention.retention().retainUntilDate()).isAfter(before.plus(Duration.ofDays(1825)));
        String version = s3.headObject(r -> r.bucket(BUCKET).key(stored.key())).versionId();
        assertThatThrownBy(() -> s3.deleteObject(r -> r.bucket(BUCKET).key(stored.key()).versionId(version)))
                .isInstanceOf(S3Exception.class);
        assertThat(storage.get(stored.key())).isEqualTo(bytes("<Invoice/>"));
    }

    @Test
    void plainObjectsAndUnconfiguredRetentionAreNotLocked() {
        DocumentStorage locking = storage(Optional.of(1826));
        DocumentStorage.StoredObject certificate = locking.put("certificates/1/c.p12.sealed", bytes("sealed"), "application/octet-stream");
        DocumentStorage.StoredObject unlocked = storage(Optional.empty())
                .putRetained("documents/test/2/signed.xml", bytes("<Invoice/>"), "application/xml");

        for (DocumentStorage.StoredObject object : new DocumentStorage.StoredObject[]{certificate, unlocked}) {
            String version = s3.headObject(r -> r.bucket(BUCKET).key(object.key())).versionId();
            s3.deleteObject(r -> r.bucket(BUCKET).key(object.key()).versionId(version));
        }
    }

    private static DocumentStorage storage(Optional<Integer> retentionDays) {
        DocumentStorage storage = new DocumentStorage();
        storage.s3 = s3;
        storage.bucket = BUCKET;
        storage.retentionDays = retentionDays;
        return storage;
    }

    private static byte[] bytes(String value) {
        return value.getBytes(StandardCharsets.UTF_8);
    }
}
