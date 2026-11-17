package com.cantte.cetus.api.nativeimage;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.localstack.LocalStackContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Postgres and LocalStack as in development (infra/postgres, infra/localstack), for the native binary, which
 * runs with the prod profile: no Dev Services, no test fakes, real KMS and S3 calls.
 */
public class NativeStack implements QuarkusTestResourceLifecycleManager {

    static final String WEBHOOK_SECRET = "whsec_Y2V0dXMtdGVzdC1vbmx5LXdlYmhvb2stc2VjcmV0IQ==";
    static final String JWT_ISSUER = "https://console.test";

    private static final Path INFRA = Path.of("../../infra").toAbsolutePath().normalize();

    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18")
            .withDatabaseName("cetus")
            .withFileSystemBind(
                    INFRA.resolve("postgres").toString(), "/docker-entrypoint-initdb.d", BindMode.READ_ONLY);

    static final LocalStackContainer LOCALSTACK = new LocalStackContainer(
                    DockerImageName.parse("localstack/localstack:3"))
            .withServices("kms", "s3")
            .withFileSystemBind(
                    INFRA.resolve("localstack").toString(), "/etc/localstack/init/ready.d", BindMode.READ_ONLY)
            .waitingFor(Wait.forLogMessage(".*LocalStack ready: alias/cetus.*", 1)
                    .withStartupTimeout(Duration.ofMinutes(2)));

    @Override
    public Map<String, String> start() {
        POSTGRES.start();
        LOCALSTACK.start();
        return Map.ofEntries(
                // Production listens on "::", which the test launcher cannot read back as a URL.
                Map.entry("%prod.quarkus.http.host", "0.0.0.0"),
                Map.entry("CETUS_DB_URL", jdbcUrl()),
                Map.entry("cetus.aws.endpoint-override", localStackUrl()),
                Map.entry("aws.accessKeyId", "test"),
                Map.entry("aws.secretAccessKey", "test"),
                Map.entry(
                        "mp.jwt.verify.publickey.location",
                        "file:"
                                + Path.of("src/test/resources/test-jwt/public.pem")
                                        .toAbsolutePath()),
                Map.entry("mp.jwt.verify.issuer", JWT_ISSUER),
                Map.entry("RESEND_WEBHOOK_SECRET", WEBHOOK_SECRET),
                Map.entry("quarkus.otel.sdk.disabled", "true"));
    }

    @Override
    public void stop() {
        LOCALSTACK.stop();
        POSTGRES.stop();
    }

    static String jdbcUrl() {
        return POSTGRES.getJdbcUrl();
    }

    static String localStackUrl() {
        return LOCALSTACK.getEndpoint().toString();
    }
}
