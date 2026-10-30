package com.cantte.cetus.worker.support;

import com.cantte.cetus.payments.Checkout;
import com.cantte.cetus.payments.CheckoutRequest;
import com.cantte.cetus.payments.EventCheck;
import com.cantte.cetus.payments.PaymentGateway;
import com.cantte.cetus.payments.PaymentRejectedException;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.payments.WompiGateway;
import com.cantte.cetus.payments.WompiKeys;
import io.micrometer.core.instrument.MeterRegistry;
import io.opentelemetry.api.trace.Tracer;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import java.util.stream.Stream;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * The Wompi keys, only from the environment (WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_INTEGRITY_SECRET,
 * WOMPI_EVENTS_SECRET), as in the API. The keys go to the gateway and are not kept here, so they cannot end up
 * in a log. Every call to Wompi gets a span and counts in cetus.payments.requests by outcome.
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
            @ConfigProperty(name = "cetus.payments.read-timeout") Duration readTimeout,
            Tracer tracer,
            MeterRegistry meters) {
        boolean configured = Stream.of(publicKey, privateKey, integritySecret, eventsSecret)
                .allMatch(key -> key.filter(value -> !value.isBlank()).isPresent());
        if (configured) {
            WompiKeys keys = new WompiKeys(
                    publicKey.get().trim(),
                    privateKey.get().trim(),
                    integritySecret.get().trim(),
                    eventsSecret.get().trim());
            this.gateway = instrumented(
                    new WompiGateway(keys, baseUrl.orElse(keys.environment().baseUrl()), connectTimeout, readTimeout),
                    tracer,
                    meters);
        } else {
            this.gateway = null;
        }
    }

    private static PaymentGateway instrumented(PaymentGateway gateway, Tracer tracer, MeterRegistry meters) {
        return new PaymentGateway() {
            @Override
            public Checkout checkout(CheckoutRequest request) {
                return gateway.checkout(request);
            }

            @Override
            public Optional<PaymentTransaction> transaction(String id) {
                return call("payments.transaction", () -> gateway.transaction(id));
            }

            @Override
            public List<PaymentTransaction> transactions(String reference) {
                return call("payments.transactions", () -> gateway.transactions(reference));
            }

            @Override
            public EventCheck verifyEvent(String body) {
                return gateway.verifyEvent(body);
            }

            private <T> T call(String span, Supplier<T> work) {
                String outcome = "failed";
                try {
                    T result = Spans.traced(tracer, span, work);
                    outcome = "ok";
                    return result;
                } catch (PaymentRejectedException e) {
                    outcome = "rejected";
                    throw e;
                } finally {
                    meters.counter("cetus.payments.requests", "outcome", outcome)
                            .increment();
                }
            }
        };
    }

    void logSettings(@Observes StartupEvent event) {
        if (gateway == null) {
            LOG.warn("Payments are not configured (WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_INTEGRITY_SECRET and"
                    + " WOMPI_EVENTS_SECRET): payment events and checks wait");
        }
    }

    /** Empty when any of the four Wompi keys is missing. */
    public Optional<PaymentGateway> gateway() {
        return Optional.ofNullable(gateway);
    }
}
