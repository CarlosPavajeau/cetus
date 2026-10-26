package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.dian.DianGateway;
import com.cantte.cetus.dian.DianSoapClient;
import com.cantte.cetus.domain.model.Environment;
import io.opentelemetry.api.OpenTelemetry;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class DianClientsTest {

    private final DianClients clients = new DianClients(
            Duration.ofSeconds(1),
            Duration.ofSeconds(1),
            Optional.empty(),
            new SimulatedDianGateway(),
            OpenTelemetry.noop().getTracer("test"));

    @Test
    void theSandboxNeverReachesTheDian() {
        assertThat(unwrapped(Environment.LIVE)).isInstanceOf(DianSoapClient.class);
        assertThat(unwrapped(Environment.TEST)).isInstanceOf(DianSoapClient.class);
        assertThat(unwrapped(Environment.SANDBOX)).isInstanceOf(SimulatedDianGateway.class);
    }

    private DianGateway unwrapped(Environment environment) {
        DianGateway gateway = clients.forEnvironment(environment);
        assertThat(gateway).isInstanceOf(TracedDianGateway.class);
        return ((TracedDianGateway) gateway).delegate();
    }
}
