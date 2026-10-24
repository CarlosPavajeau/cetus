package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.dian.DianSoapClient;
import com.cantte.cetus.domain.model.Environment;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class DianClientsTest {

    private final DianClients clients =
            new DianClients(Duration.ofSeconds(1), Duration.ofSeconds(1), Optional.empty(), new SimulatedDianGateway());

    @Test
    void theSandboxNeverReachesTheDian() {
        assertThat(clients.forEnvironment(Environment.LIVE)).isInstanceOf(DianSoapClient.class);
        assertThat(clients.forEnvironment(Environment.TEST)).isInstanceOf(DianSoapClient.class);
        assertThat(clients.forEnvironment(Environment.SANDBOX)).isInstanceOf(SimulatedDianGateway.class);
    }
}
