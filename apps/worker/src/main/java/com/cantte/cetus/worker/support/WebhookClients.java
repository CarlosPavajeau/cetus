package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.cache.Cache;
import com.cantte.cetus.cache.Caches;
import com.cantte.cetus.webhooks.WebhookTargets;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.net.InetAddress;
import java.net.Proxy;
import java.net.UnknownHostException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import okhttp3.Dns;
import okhttp3.OkHttpClient;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jetbrains.annotations.NotNull;

/**
 * HTTP client and settings for webhook deliveries.
 *
 * <p>Internal addresses are refused by the client's own DNS lookup, so the address checked is the one the
 * connection uses: resolving first and connecting later would let a host answer a public address to the
 * check and an internal one to the connection (DNS rebinding). Redirects are never followed and no proxy is
 * used, since either would connect somewhere the lookup did not check. Decrypted signing secrets are kept
 * in memory for a few minutes so KMS is not hit on every delivery.
 */
@ApplicationScoped
public class WebhookClients {

    private final OkHttpClient http;
    private final boolean allowPrivateTargets;
    private final Cache<SecretIdentity, String> secrets;

    @Inject
    SecretCipher cipher;

    /** {@code cetus.webhooks.allow-private-targets} is only true in development and tests. */
    public WebhookClients(
            @ConfigProperty(name = "cetus.webhooks.connect-timeout") Duration connectTimeout,
            @ConfigProperty(name = "cetus.webhooks.request-timeout") Duration requestTimeout,
            @ConfigProperty(name = "cetus.webhooks.allow-private-targets") boolean allowPrivateTargets,
            Caches caches,
            @ConfigProperty(name = "cetus.cache.webhooks.max-entries", defaultValue = "512") int capacity) {
        this.secrets = caches.local("webhook-secrets", capacity, Duration.ofMinutes(10));
        this.allowPrivateTargets = allowPrivateTargets;
        this.http = new OkHttpClient.Builder()
                .dns(allowPrivateTargets ? Dns.SYSTEM : new PublicOnlyDns(Dns.SYSTEM))
                .proxy(Proxy.NO_PROXY)
                .followRedirects(false)
                .followSslRedirects(false)
                .retryOnConnectionFailure(false)
                .connectTimeout(connectTimeout)
                .callTimeout(requestTimeout)
                .build();
    }

    public OkHttpClient http() {
        return http;
    }

    public boolean allowPrivateTargets() {
        return allowPrivateTargets;
    }

    public String secret(UUID endpointId, byte[] sealed) {
        return secrets.get(new SecretIdentity(endpointId, SealedFingerprint.of(sealed)), () -> cipher.openText(sealed));
    }

    /** Thrown by the lookup when a webhook host resolves to an internal address. */
    public static class BlockedTargetException extends UnknownHostException {

        public BlockedTargetException(String message) {
            super(message);
        }
    }

    /**
     * Resolves like {@code delegate} but fails when any address is internal. All of them are checked, not
     * only the first: the client may fall back to the others.
     */
    static final class PublicOnlyDns implements Dns {

        private final Dns delegate;

        PublicOnlyDns(Dns delegate) {
            this.delegate = delegate;
        }

        @Override
        public @NotNull List<InetAddress> lookup(@NotNull String hostname) throws UnknownHostException {
            List<InetAddress> addresses = delegate.lookup(hostname);
            for (InetAddress address : addresses) {
                if (WebhookTargets.isPrivate(address)) {
                    throw new BlockedTargetException(
                            hostname + " resolves to an internal address (" + address.getHostAddress() + ")");
                }
            }
            return addresses;
        }
    }

    private record SecretIdentity(UUID endpointId, String fingerprint) {}
}
