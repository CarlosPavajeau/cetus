package com.cantte.cetus.api.batches;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class BatchRequestLimitsTest {

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
