package com.cantte.cetus.worker.runner;

import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import org.postgresql.Driver;
import org.postgresql.PGConnection;
import org.postgresql.PGNotification;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.Optional;
import java.util.Properties;

/**
 * Wakes the {@link JobRunner} the moment a job is enqueued: the jobs table NOTIFYs {@value #CHANNEL} on every
 * insert (migration V15) and this LISTENs on a connection of its own, outside the pool. The poll stays as the
 * safety net, so a dropped connection only delays jobs until the next poll while this reconnects.
 *
 * <p>LISTEN needs a session that lasts: through a transaction-mode pooler (PgBouncer, PlanetScale's port 6432)
 * it silently stops hearing anything. {@code cetus.jobs.listen-url} points it at a direct connection when the
 * datasource goes through one.
 */
@ApplicationScoped
public class JobListener {

    static final String CHANNEL = "billing_jobs";
    private static final Logger LOG = Logger.getLogger(JobListener.class);
    /** How long to wait for a notification before checking that the connection is still alive. */
    private static final int WAIT_MILLIS = 10_000;
    private static final Duration MAX_BACKOFF = Duration.ofMinutes(1);

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

    private volatile boolean running;
    private volatile Connection connection;
    private Thread thread;

    void start(@Observes StartupEvent event) {
        Optional<String> url = listenUrl.filter(value -> !value.isBlank()).or(() -> datasourceUrl);
        if (!enabled || url.isEmpty()) {
            LOG.info("Not listening for new jobs: they start on the next poll");
            return;
        }
        running = true;
        thread = Thread.ofPlatform().name("job-listener").daemon().start(() -> listen(url.get()));
    }

    void stop(@Observes ShutdownEvent event) throws InterruptedException {
        if (!running) {
            return;
        }
        running = false;
        closeQuietly(connection);
        thread.join(Duration.ofSeconds(5));
    }

    private void listen(String url) {
        Duration backoff = Duration.ofSeconds(1);
        while (running) {
            try (Connection listening = connect(url)) {
                connection = listening;
                try (Statement statement = listening.createStatement()) {
                    statement.execute("LISTEN " + CHANNEL);
                }
                LOG.infof("Listening for new jobs on %s", CHANNEL);
                backoff = Duration.ofSeconds(1);
                // Whatever was enqueued while not listening.
                runner.wake();
                waitForNotifications(listening);
            } catch (SQLException e) {
                if (!running) {
                    return;
                }
                LOG.warnf("Lost the job notifications connection (%s); retrying in %ds, polling meanwhile",
                        e.getMessage(), backoff.toSeconds());
                sleep(backoff);
                backoff = backoff.multipliedBy(2).compareTo(MAX_BACKOFF) > 0 ? MAX_BACKOFF : backoff.multipliedBy(2);
            }
        }
    }

    private void waitForNotifications(Connection listening) throws SQLException {
        PGConnection pg = listening.unwrap(PGConnection.class);
        while (running) {
            PGNotification[] notifications = pg.getNotifications(WAIT_MILLIS);
            if (notifications != null && notifications.length > 0) {
                runner.wake();
            } else {
                // A quiet channel and a dead connection look the same: a round trip tells them apart.
                try (Statement statement = listening.createStatement()) {
                    statement.execute("SELECT 1");
                }
            }
        }
    }

    private Connection connect(String url) throws SQLException {
        Properties properties = new Properties();
        username.ifPresent(value -> properties.setProperty("user", value));
        password.ifPresent(value -> properties.setProperty("password", value));
        properties.setProperty("ApplicationName", "cetus-worker-listener");
        Connection opened = new Driver().connect(url, properties);
        if (opened == null) {
            throw new SQLException("Not a PostgreSQL JDBC URL: " + url.replaceAll("//[^@/]*@", "//***@"));
        }
        return opened;
    }

    private static void sleep(Duration duration) {
        try {
            Thread.sleep(duration);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static void closeQuietly(Connection connection) {
        if (connection == null) {
            return;
        }
        try {
            connection.close();
        } catch (SQLException ignored) {
            // Closing only interrupts the wait; nothing to recover.
        }
    }
}
