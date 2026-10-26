package com.cantte.cetus.worker.support;

import com.cantte.cetus.dian.DianEndpoint;
import com.cantte.cetus.dian.DianGateway;
import com.cantte.cetus.dian.DianSoapClient;
import com.cantte.cetus.domain.model.Environment;
import io.micrometer.core.instrument.MeterRegistry;
import io.opentelemetry.api.trace.Tracer;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Duration;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

@ApplicationScoped
public class DianClients {

    private static final Logger LOG = Logger.getLogger(DianClients.class);

    private final DianGateway test;
    private final DianGateway live;
    private final DianGateway sandbox;

    /** {@code cetus.dian.test-url} redirects only the TEST environment (e.g. to the local mock); LIVE is fixed. */
    public DianClients(
            @ConfigProperty(name = "cetus.dian.connect-timeout") Duration connectTimeout,
            @ConfigProperty(name = "cetus.dian.request-timeout") Duration requestTimeout,
            @ConfigProperty(name = "cetus.dian.test-url") Optional<String> testUrl,
            SimulatedDianGateway sandbox,
            Tracer tracer,
            MeterRegistry meters) {
        String testEndpoint = testUrl.filter(url -> !url.isBlank()).orElse(DianEndpoint.TEST.url());
        if (!testEndpoint.equals(DianEndpoint.TEST.url())) {
            LOG.warnf("DIAN TEST environment redirected to %s", testEndpoint);
        }
        this.test = new InstrumentedDianGateway(
                new DianSoapClient(testEndpoint, connectTimeout, requestTimeout), tracer, meters);
        this.live = new InstrumentedDianGateway(
                new DianSoapClient(DianEndpoint.LIVE, connectTimeout, requestTimeout), tracer, meters);
        this.sandbox = new InstrumentedDianGateway(sandbox, tracer, meters);
    }

    /** SANDBOX never reaches the DIAN, not even its habilitación environment. */
    public DianGateway forEnvironment(Environment environment) {
        return switch (environment) {
            case LIVE -> live;
            case TEST -> test;
            case SANDBOX -> sandbox;
        };
    }
}
