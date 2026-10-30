package com.cantte.cetus.api.billing;

import com.cantte.cetus.payments.PaymentGateway;
import com.cantte.cetus.payments.WompiGateway;
import com.cantte.cetus.payments.WompiKeys;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import java.net.URI;
import java.time.Duration;
import java.util.Optional;
import java.util.stream.Stream;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * The Wompi keys, only from the environment (WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_INTEGRITY_SECRET,
 * WOMPI_EVENTS_SECRET). Without all four nothing can be bought, so local development works without them. The
 * keys go to the gateway and are not kept here, so they cannot end up in a log.
 */
@ApplicationScoped
public class PaymentClients {

    private static final Logger LOG = Logger.getLogger(PaymentClients.class);

    private final PaymentGateway gateway;

    /** {@code cetus.payments.wompi.base-url} only changes in tests, to point the gateway at a fake. */
    public PaymentClients(
            @ConfigProperty(name = "cetus.payments.wompi.public-key") Optional<String> publicKey,
            @ConfigProperty(name = "cetus.payments.wompi.private-key") Optional<String> privateKey,
            @ConfigProperty(name = "cetus.payments.wompi.integrity-secret") Optional<String> integritySecret,
            @ConfigProperty(name = "cetus.payments.wompi.events-secret") Optional<String> eventsSecret,
            @ConfigProperty(name = "cetus.payments.wompi.base-url") Optional<URI> baseUrl,
            @ConfigProperty(name = "cetus.payments.connect-timeout") Duration connectTimeout,
            @ConfigProperty(name = "cetus.payments.read-timeout") Duration readTimeout) {
        boolean configured = Stream.of(publicKey, privateKey, integritySecret, eventsSecret)
                .allMatch(key -> key.filter(value -> !value.isBlank()).isPresent());
        if (configured) {
            WompiKeys keys = new WompiKeys(
                    publicKey.get().trim(),
                    privateKey.get().trim(),
                    integritySecret.get().trim(),
                    eventsSecret.get().trim());
            this.gateway =
                    new WompiGateway(keys, baseUrl.orElse(keys.environment().baseUrl()), connectTimeout, readTimeout);
        } else {
            this.gateway = null;
        }
    }

    void logSettings(@Observes StartupEvent event) {
        if (gateway == null) {
            LOG.warn("Payments are not configured (WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_INTEGRITY_SECRET and"
                    + " WOMPI_EVENTS_SECRET): orders cannot be placed");
        }
    }

    /** Empty when any of the four Wompi keys is missing. */
    public Optional<PaymentGateway> gateway() {
        return Optional.ofNullable(gateway);
    }
}
