package com.cantte.cetus.api.auth;

import com.cantte.cetus.persistence.ChannelListener;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Drops from this replica's {@link AccessCache} the keys revoked and the accounts changed on any replica. While the
 * connection is down, the caches' TTL still bounds how long a stale entry lives.
 */
@ApplicationScoped
public class AccessListener {

    private static final Logger LOG = Logger.getLogger(AccessListener.class);

    @Inject
    AccessCache access;

    @ConfigProperty(name = "cetus.access.listen")
    boolean enabled;

    @ConfigProperty(name = "cetus.access.listen-url")
    Optional<String> listenUrl;

    @ConfigProperty(name = "quarkus.datasource.jdbc.url")
    Optional<String> datasourceUrl;

    @ConfigProperty(name = "quarkus.datasource.username")
    Optional<String> username;

    @ConfigProperty(name = "quarkus.datasource.password")
    Optional<String> password;

    private ChannelListener listener;

    void start(@Observes StartupEvent event) {
        Optional<String> url = listenUrl.filter(value -> !value.isBlank()).or(() -> datasourceUrl);
        if (!enabled || url.isEmpty()) {
            LOG.info("Not listening for access changes: other replicas' show within the cache TTL");
            return;
        }
        listener = new ChannelListener(new ChannelListener.Settings(
                AccessCache.CHANNEL,
                "cetus-api-access-listener",
                url.get(),
                username.orElse(null),
                password.orElse(null),
                () -> {},
                access::invalidate));
        listener.start();
    }

    void stop(@Observes ShutdownEvent event) throws InterruptedException {
        if (listener != null) {
            listener.stop();
        }
    }
}
