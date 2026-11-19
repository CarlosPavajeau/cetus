package com.cantte.cetus.api.batches;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

import com.cantte.cetus.api.support.ConsoleUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class BatchRequestLimitsTest {

    @TestHTTPResource(BatchRequestLimits.PATH)
    URI batches;

    @Test
    void aBodyAboveTheLimitIsRefusedBeforeItIsRead() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Lote Grande SAS");
        Map<String, Object> request =
                Map.of("issuerId", UUID.randomUUID(), "items", List.of(), "fileName", "x".repeat(6 * 1024 * 1024));

        ConsoleBatchResourceTest.send(user, UUID.randomUUID().toString(), request)
                .then()
                .statusCode(413)
                .body("code", equalTo("batch_too_large"));
    }

    @Test
    void aBodyWithoutItsLengthIsRefused() throws IOException, InterruptedException {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Lote Trozos SAS");
        byte[] body = new ObjectMapper().writeValueAsBytes(Map.of("issuerId", UUID.randomUUID(), "items", List.of()));
        HttpRequest chunked = HttpRequest.newBuilder(batches)
                .header("Authorization", "Bearer " + user.token())
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .header("X-Cetus-Client-IP", ConsoleUser.CLIENT_IP)
                .header("X-Cetus-Client-User-Agent", ConsoleUser.CLIENT_USER_AGENT)
                .POST(HttpRequest.BodyPublishers.ofInputStream(() -> new ByteArrayInputStream(body)))
                .build();

        try (HttpClient client =
                HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build()) {
            HttpResponse<String> response = client.send(chunked, HttpResponse.BodyHandlers.ofString());

            assertThat(response.statusCode()).isEqualTo(411);
            assertThat(new ObjectMapper().readTree(response.body()).path("code").asText())
                    .isEqualTo("length_required");
        }
    }

    @Test
    void anAccountSendsAFewBatchesAMinute() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Lote Rafaga SAS");
        Map<String, Object> empty = Map.of("issuerId", UUID.randomUUID(), "items", List.of());
        for (int i = 0; i < 6; i++) {
            ConsoleBatchResourceTest.send(user, UUID.randomUUID().toString(), empty)
                    .then()
                    .statusCode(400);
        }

        ConsoleBatchResourceTest.send(user, UUID.randomUUID().toString(), empty)
                .then()
                .statusCode(429)
                .body("code", equalTo("rate_limited"))
                .header("Retry-After", notNullValue());
    }
}
