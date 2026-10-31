package com.cantte.cetus.persistence.credits;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** A credit movement is never changed nor deleted, whoever connects: the database refuses it. */
@Testcontainers
class CreditMovementsAppendOnlyTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18");

    @BeforeAll
    static void migrate() throws SQLException {
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .schemas("billing")
                .load()
                .migrate();
        try (Connection connection = connect();
                Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    WITH account AS (
                        INSERT INTO billing.accounts (id, organization_id, name, plan_id)
                        SELECT uuidv7(), 'org_ledger', 'Acme', id FROM billing.plans WHERE code = 'FREE'
                        RETURNING id
                    )
                    INSERT INTO billing.credit_movements (account_id, type, quantity, actor_type)
                    SELECT id, 'ADJUST', 0, 'SYSTEM' FROM account
                    """);
        }
    }

    @Test
    void updateFails() {
        assertRejected("UPDATE billing.credit_movements SET quantity = 5");
    }

    @Test
    void deleteFails() {
        assertRejected("DELETE FROM billing.credit_movements");
    }

    @Test
    void truncateFails() {
        assertRejected("TRUNCATE billing.credit_movements");
    }

    private static void assertRejected(String sql) {
        assertThatThrownBy(() -> {
                    try (Connection connection = connect();
                            Statement statement = connection.createStatement()) {
                        statement.executeUpdate(sql);
                    }
                })
                .isInstanceOf(SQLException.class)
                .hasMessageContaining("credit_movements is append-only");
    }

    private static Connection connect() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }
}
