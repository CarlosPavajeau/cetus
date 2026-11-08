package com.cantte.cetus.worker.runner;

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
 * Wakes the {@link JobRunner} the moment a job is enqueued: the jobs table NOTIFYs {@value #CHANNEL} on every
 * insert (migration V15) and this LISTENs on a connection of its own, outside the pool. The poll stays as the
 * safety net, so a dropped connection only delays jobs until the next poll while this reconnects.
 *
 * <p>{@code cetus.jobs.listen-url} points it at a direct connection when the datasource goes through a
 * transaction-mode pooler, where LISTEN hears nothing.
 */
@ApplicationScoped
public class JobListener {

    static final String CHANNEL = "billing_jobs";
    private static final Logger LOG = Logger.getLogger(JobListener.class);

    @Inject
    JobRunner runner;

    @ConfigProperty(name = "cetus.jobs.listen")
    boolean enabled;

    @ConfigProperty(name = "cetus.jobs.listen-url")
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
            LOG.info("Not listening for new jobs: they start on the next poll");
            return;
        }
        // Whatever was enqueued while not listening is claimed on each connection.
        listener = new ChannelListener(new ChannelListener.Settings(
                CHANNEL,
                "cetus-worker-listener",
                url.get(),
                username.orElse(null),
                password.orElse(null),
                runner::wake,
                payload -> runner.wake()));
        listener.start();
    }

    void stop(@Observes ShutdownEvent event) throws InterruptedException {
        if (listener != null) {
            listener.stop();
        }
    }
}
