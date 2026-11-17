package com.cantte.cetus.aws;

import java.net.URI;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.kms.KmsClient;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * Reads what the native binary stored in LocalStack and opens it with the JVM's {@link SecretCipher}, as the
 * worker does in production: the sealed format must not depend on how the API was compiled.
 */
public final class LocalStackSecrets implements AutoCloseable {

    private final KmsClient kms;
    private final S3Client s3;
    private final SecretCipher cipher = new SecretCipher();

    public LocalStackSecrets(String endpoint) {
        var credentials = StaticCredentialsProvider.create(AwsBasicCredentials.create("test", "test"));
        kms = KmsClient.builder()
                .region(Region.US_EAST_1)
                .credentialsProvider(credentials)
                .endpointOverride(URI.create(endpoint))
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();
        s3 = S3Client.builder()
                .region(Region.US_EAST_1)
                .credentialsProvider(credentials)
                .endpointOverride(URI.create(endpoint))
                .forcePathStyle(true)
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();
        cipher.kms = kms;
        cipher.keyId = "alias/cetus";
    }

    public byte[] openObject(String key) {
        return cipher.open(
                s3.getObjectAsBytes(r -> r.bucket("cetus-documents").key(key)).asByteArray());
    }

    public String openText(byte[] sealed) {
        return cipher.openText(sealed);
    }

    @Override
    public void close() {
        kms.close();
        s3.close();
    }
}
