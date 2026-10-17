package com.cantte.cetus.worker.support;

import com.cantte.cetus.dian.DianEndpoint;
import com.cantte.cetus.dian.DianSoapClient;
import com.cantte.cetus.domain.model.Environment;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.util.Optional;

@ApplicationScoped
public class DianClients {

    private static final Logger LOG = Logger.getLogger(DianClients.class);

    private final DianSoapClient test;
    private final DianSoapClient live;

    /** {@code cetus.dian.test-url} redirects only the TEST environment (e.g. to the local mock); LIVE is fixed. */
    public DianClients(@ConfigProperty(name = "cetus.dian.connect-timeout") Duration connectTimeout,
                       @ConfigProperty(name = "cetus.dian.request-timeout") Duration requestTimeout,
                       @ConfigProperty(name = "cetus.dian.test-url") Optional<String> testUrl) {
        String testEndpoint = testUrl.filter(url -> !url.isBlank()).orElse(DianEndpoint.TEST.url());
        if (!testEndpoint.equals(DianEndpoint.TEST.url())) {
            LOG.warnf("DIAN TEST environment redirected to %s", testEndpoint);
        }
        this.test = new DianSoapClient(testEndpoint, connectTimeout, requestTimeout);
        this.live = new DianSoapClient(DianEndpoint.LIVE, connectTimeout, requestTimeout);
    }

    public DianSoapClient forEnvironment(Environment environment) {
        return environment == Environment.LIVE ? live : test;
    }
}
