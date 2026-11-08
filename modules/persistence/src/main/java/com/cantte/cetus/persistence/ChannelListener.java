package com.cantte.cetus.persistence;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.Properties;
import java.util.function.Consumer;
import org.jboss.logging.Logger;
import org.postgresql.Driver;
import org.postgresql.PGConnection;
import org.postgresql.PGNotification;

/**
 * LISTENs on a Postgres channel from a connection of its own, outside the pool, on a thread of its own, and
 * reconnects with backoff when the connection drops. A NOTIFY reaches it once the transaction that sent it commits.
 *
 * <p>LISTEN needs a session that lasts: through a transaction-mode pooler (PgBouncer, PlanetScale's port 6432) it
 * silently stops hearing anything, so {@code url} must be a direct connection.
 */
public final class ChannelListener {

    private static final Logger LOG = Logger.getLogger(ChannelListener.class);
    /** How long to wait for a notification before checking that the connection is still alive. */
    private static final int WAIT_MILLIS = 10_000;

    private static final Duration MAX_BACKOFF = Duration.ofMinutes(1);

    /** Longer than the wait for notifications, so a quiet channel never trips it. */
    private static final Duration SOCKET_TIMEOUT = Duration.ofSeconds(30);

    /**
     * @param onConnect runs each time it starts listening, for whatever was missed while it was not
     * @param onNotification gets each payload
     */
    public record Settings(
            String channel,
            String applicationName,
            String url,
            String username,
            String password,
            Runnable onConnect,
            Consumer<String> onNotification) {}

    private final Settings settings;
    private volatile boolean running;
    private volatile Connection connection;
    private Thread thread;

    public ChannelListener(Settings settings) {
        this.settings = settings;
    }

    public void start() {
        running = true;
        thread = Thread.ofPlatform()
                .name("listen-" + settings.channel())
                .daemon()
                .start(this::listen);
    }

    public void stop() throws InterruptedException {
        if (!running) {
            return;
        }
        running = false;
        closeQuietly(connection);
        thread.join(Duration.ofSeconds(5));
    }

    private void listen() {
        Duration backoff = Duration.ofSeconds(1);
        while (running) {
            try (Connection listening = connect()) {
                connection = listening;
                try (Statement statement = listening.createStatement()) {
                    statement.execute("LISTEN " + settings.channel());
                }
                LOG.infof("Listening on %s", settings.channel());
                backoff = Duration.ofSeconds(1);
                settings.onConnect().run();
                waitForNotifications(listening);
            } catch (SQLException e) {
                if (!running) {
                    return;
                }
                LOG.warnf(
                        "Lost the connection listening on %s (%s); retrying in %ds",
                        settings.channel(), e.getMessage(), backoff.toSeconds());
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
                for (PGNotification notification : notifications) {
                    try {
                        settings.onNotification().accept(notification.getParameter());
                    } catch (RuntimeException e) {
                        LOG.warnf(e, "Could not act on a notification of %s", settings.channel());
                    }
                }
            } else {
                // A quiet channel and a dead connection look the same: a round trip tells them apart.
                try (Statement statement = listening.createStatement()) {
                    statement.execute("SELECT 1");
                }
            }
        }
    }

    private Connection connect() throws SQLException {
        Properties properties = new Properties();
        if (settings.username() != null) {
            properties.setProperty("user", settings.username());
        }
        if (settings.password() != null) {
            properties.setProperty("password", settings.password());
        }
        properties.setProperty("ApplicationName", settings.applicationName());
        // A half-open connection would block the liveness probe forever; this makes it fail so the loop reconnects.
        properties.setProperty("socketTimeout", String.valueOf(SOCKET_TIMEOUT.toSeconds()));
        properties.setProperty("tcpKeepAlive", "true");
        Connection opened = new Driver().connect(settings.url(), properties);
        if (opened == null) {
            throw new SQLException(
                    "Not a PostgreSQL JDBC URL: " + settings.url().replaceAll("//[^@/]*@", "//***@"));
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
