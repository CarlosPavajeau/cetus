package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.webhooks.WebhookTargets;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * HTTP client and settings for webhook deliveries. Redirects are never followed (a redirect could lead to
 * an internal address), and decrypted signing secrets are kept in memory for a few minutes so KMS is not
 * hit on every delivery.
 */
@ApplicationScoped
public class WebhookClients {

    private static final Duration SECRET_TTL = Duration.ofMinutes(10);

    private final HttpClient http;
    private final Duration requestTimeout;
    private final boolean allowPrivateTargets;
    private final Map<UUID, CachedSecret> secrets = new ConcurrentHashMap<>();

    @Inject
    SecretCipher cipher;

    /** {@code cetus.webhooks.allow-private-targets} is only true in development and tests. */
    public WebhookClients(@ConfigProperty(name = "cetus.webhooks.connect-timeout") Duration connectTimeout,
                          @ConfigProperty(name = "cetus.webhooks.request-timeout") Duration requestTimeout,
                          @ConfigProperty(name = "cetus.webhooks.allow-private-targets") boolean allowPrivateTargets) {
        this.http = HttpClient.newBuilder()
                .connectTimeout(connectTimeout)
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        this.requestTimeout = requestTimeout;
        this.allowPrivateTargets = allowPrivateTargets;
    }

    public HttpClient http() {
        return http;
    }

    public Duration requestTimeout() {
        return requestTimeout;
    }

    public boolean allowPrivateTargets() {
        return allowPrivateTargets;
    }

    /**
     * Resolves the host and checks none of its addresses is internal.
     *
     * @return why the URL must not be called, or empty when it can be
     * @throws UnknownHostException when the host does not resolve (possibly a transient DNS failure)
     */
    public Optional<String> blockedTarget(URI uri) throws UnknownHostException {
        if (allowPrivateTargets) {
            return Optional.empty();
        }
        for (InetAddress address : InetAddress.getAllByName(uri.getHost())) {
            if (WebhookTargets.isPrivate(address)) {
                return Optional.of(uri.getHost() + " resolves to an internal address (" + address.getHostAddress() + ")");
            }
        }
        return Optional.empty();
    }

    public String secret(UUID endpointId, byte[] sealed) {
        CachedSecret cached = secrets.get(endpointId);
        if (cached != null && cached.loadedAt().plus(SECRET_TTL).isAfter(Instant.now())) {
            return cached.secret();
        }
        String secret = cipher.openText(sealed);
        secrets.put(endpointId, new CachedSecret(secret, Instant.now()));
        return secret;
    }

    private record CachedSecret(String secret, Instant loadedAt) {
    }
}
