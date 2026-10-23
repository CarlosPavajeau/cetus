package com.cantte.cetus.worker.support;

import com.cantte.cetus.dian.DianSoapClient;
import com.cantte.cetus.domain.model.Environment;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DianClientsTest {

    private final DianClients clients = new DianClients(Duration.ofSeconds(1), Duration.ofSeconds(1), Optional.empty());

    @Test
    void theSandboxNeverReachesTheDian() {
        assertThat(clients.forEnvironment(Environment.LIVE)).isInstanceOf(DianSoapClient.class);
        assertThat(clients.forEnvironment(Environment.TEST)).isInstanceOf(DianSoapClient.class);
        assertThatThrownBy(() -> clients.forEnvironment(Environment.SANDBOX)).isInstanceOf(IllegalStateException.class);
    }
}
