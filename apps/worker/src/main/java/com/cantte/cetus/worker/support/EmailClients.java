package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.email.EmailSender;
import com.cantte.cetus.email.ResendEmailSender;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.util.Optional;

/**
 * Email delivery settings. The API key and the sender only come from the environment (RESEND_API_KEY,
 * CETUS_EMAIL_FROM), never from the code; without them deliveries are skipped, so local development works
 * without a key. The key is handed to the SDK and not kept here, so it cannot end up in a log.
 */
@ApplicationScoped
public class EmailClients {

    private static final Logger LOG = Logger.getLogger(EmailClients.class);

    private final EmailSender sender;
    private final String from;
    private final Optional<String> testRecipient;
    private final Duration rateLimitDelay;

    /** {@code cetus.email.resend.base-url} only changes in tests, to point the SDK at a fake. */
    public EmailClients(@ConfigProperty(name = "cetus.email.resend.api-key") Optional<String> apiKey,
                        @ConfigProperty(name = "cetus.email.resend.base-url") String baseUrl,
                        @ConfigProperty(name = "cetus.email.connect-timeout") Duration connectTimeout,
                        @ConfigProperty(name = "cetus.email.read-timeout") Duration readTimeout,
                        @ConfigProperty(name = "cetus.email.from") Optional<String> from,
                        @ConfigProperty(name = "cetus.email.test-recipient") Optional<String> testRecipient,
                        @ConfigProperty(name = "cetus.email.rate-limit-delay") Duration rateLimitDelay) {
        boolean configured = apiKey.filter(key -> !key.isBlank()).isPresent() && from.filter(f -> !f.isBlank()).isPresent();
        this.sender = configured ? new ResendEmailSender(apiKey.get().trim(), baseUrl, connectTimeout, readTimeout) : null;
        this.from = from.orElse(null);
        this.testRecipient = testRecipient.filter(recipient -> !recipient.isBlank());
        this.rateLimitDelay = rateLimitDelay;
    }

    void logSettings(@Observes StartupEvent event) {
        if (sender == null) {
            LOG.warn("Email delivery is not configured (RESEND_API_KEY and CETUS_EMAIL_FROM): deliveries are skipped");
        } else if (testRecipient.isEmpty()) {
            LOG.info("No CETUS_EMAIL_TEST_RECIPIENT: TEST documents are not emailed");
        }
    }

    /** Empty when RESEND_API_KEY or CETUS_EMAIL_FROM is missing. */
    public Optional<EmailSender> sender() {
        return Optional.ofNullable(sender);
    }

    public String from() {
        return from;
    }

    /**
     * Who receives the document: the customer in LIVE; in TEST, whose customers are usually test data,
     * the configured test mailbox instead.
     */
    public Optional<String> recipient(Environment environment, Party customer) {
        if (environment == Environment.TEST) {
            return testRecipient;
        }
        return Optional.ofNullable(customer.email()).filter(email -> !email.isBlank());
    }

    public Duration rateLimitDelay() {
        return rateLimitDelay;
    }
}
