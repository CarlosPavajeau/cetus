package com.cantte.cetus.worker.support;

import org.junit.jupiter.api.Test;

import java.net.URI;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

/** The SSRF guard: hosts that resolve to internal addresses are refused unless explicitly allowed. */
class WebhookClientsTest {

    @Test
    void refusesHostsThatResolveToInternalAddresses() throws Exception {
        WebhookClients clients = new WebhookClients(Duration.ofSeconds(1), Duration.ofSeconds(1), false);

        assertThat(clients.blockedTarget(URI.create("http://localhost:8080/hook"))).isPresent();
        assertThat(clients.blockedTarget(URI.create("http://127.0.0.1/hook"))).hasValueSatisfying(reason ->
                assertThat(reason).contains("internal address"));
    }

    @Test
    void allowsThemWhenConfiguredForDevelopment() throws Exception {
        WebhookClients clients = new WebhookClients(Duration.ofSeconds(1), Duration.ofSeconds(1), true);

        assertThat(clients.blockedTarget(URI.create("http://localhost:8080/hook"))).isEmpty();
    }
}
