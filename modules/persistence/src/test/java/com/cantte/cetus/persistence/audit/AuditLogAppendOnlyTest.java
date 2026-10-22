package com.cantte.cetus.persistence.audit;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The append-only guarantee lives in the database, so it is tested against the real migrations. */
@Testcontainers
class AuditLogAppendOnlyTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18");

    @BeforeAll
    static void migrate() throws SQLException {
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .schemas("billing")
                .load()
                .migrate();
        try (Connection connection = connect(); Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO billing.audit_log (actor_type, action, data, ip_address)
                    VALUES ('SYSTEM', 'ACCOUNT_CREATED', '{"name": "Acme"}', '203.0.113.7')
                    """);
        }
    }

    @Test
    void insertsAreAllowed() throws SQLException {
        try (Connection connection = connect(); Statement statement = connection.createStatement();
             ResultSet rows = statement.executeQuery(
                     "SELECT count(*), max(host(ip_address)) FROM billing.audit_log")) {
            rows.next();
            assertThat(rows.getLong(1)).isPositive();
            assertThat(rows.getString(2)).isEqualTo("203.0.113.7");
        }
    }

    @Test
    void updateFails() {
        assertRejected("UPDATE billing.audit_log SET action = 'API_KEY_REVOKED'");
    }

    @Test
    void deleteFails() {
        assertRejected("DELETE FROM billing.audit_log");
    }

    @Test
    void truncateFails() {
        assertRejected("TRUNCATE billing.audit_log");
    }

    private static void assertRejected(String sql) {
        assertThatThrownBy(() -> {
            try (Connection connection = connect(); Statement statement = connection.createStatement()) {
                statement.executeUpdate(sql);
            }
        }).isInstanceOf(SQLException.class).hasMessageContaining("audit_log is append-only");
    }

    private static Connection connect() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }
}
