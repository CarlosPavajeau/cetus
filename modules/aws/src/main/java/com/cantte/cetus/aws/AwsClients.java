package com.cantte.cetus.aws;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Disposes;
import jakarta.enterprise.inject.Produces;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.kms.KmsClient;
import software.amazon.awssdk.services.s3.S3Client;

import java.net.URI;
import java.util.Optional;

/**
 * AWS SDK clients. Credentials come from the default chain; on Railway set
 * AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY for a least-privilege IAM user.
 */
@ApplicationScoped
public class AwsClients {

    @ConfigProperty(name = "cetus.aws.region")
    String region;

    /** Only for local development with LocalStack (e.g. http://localhost:4566). */
    @ConfigProperty(name = "cetus.aws.endpoint-override")
    Optional<URI> endpointOverride;

    @Produces
    @ApplicationScoped
    KmsClient kmsClient() {
        var builder = KmsClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .httpClientBuilder(UrlConnectionHttpClient.builder());
        endpointOverride.ifPresent(builder::endpointOverride);
        return builder.build();
    }

    @Produces
    @ApplicationScoped
    S3Client s3Client() {
        var builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .httpClientBuilder(UrlConnectionHttpClient.builder());
        endpointOverride.ifPresent(uri -> builder.endpointOverride(uri).forcePathStyle(true));
        return builder.build();
    }

    void closeKms(@Disposes KmsClient client) {
        client.close();
    }

    void closeS3(@Disposes S3Client client) {
        client.close();
    }
}
