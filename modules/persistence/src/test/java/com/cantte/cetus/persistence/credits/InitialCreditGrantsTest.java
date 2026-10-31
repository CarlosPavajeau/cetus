package com.cantte.cetus.persistence.credits;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** V37 gives each account already in production one EMPRENDEDOR lot, and nothing to the others. */
@Testcontainers
class InitialCreditGrantsTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18");

    private static final UUID ACCOUNT_LIVE = UUID.randomUUID();
    private static final UUID ACCOUNT_TEST = UUID.randomUUID();

    @BeforeAll
    static void migrate() throws SQLException {
        flyway("36").migrate();
        try (Connection connection = connect();
                Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO billing.accounts (id, organization_id, name, plan_id)
                    SELECT '%1$s', 'org_live', 'Producción SAS', id
                    FROM billing.plans WHERE code = 'FREE';
                    INSERT INTO billing.accounts (id, organization_id, name, plan_id)
                    SELECT '%2$s', 'org_test', 'Pruebas SAS', id
                    FROM billing.plans WHERE code = 'FREE';
                    INSERT INTO billing.issuers (id, account_id, environment, nit, check_digit, legal_name, person_type,
                                                 tax_level_codes, address, email, operation_mode)
                    VALUES ('%3$s', '%1$s', 'LIVE',
                            '900123456', '8', 'Producción SAS', 'LEGAL_ENTITY', 'O-13', '{}', 'f@produccion.test',
                            'OWN_SOFTWARE'),
                           ('%4$s', '%2$s', 'TEST',
                            '900123456', '8', 'Pruebas SAS', 'LEGAL_ENTITY', 'O-13', '{}', 'f@pruebas.test',
                            'OWN_SOFTWARE');
                    """.formatted(ACCOUNT_LIVE, ACCOUNT_TEST, UUID.randomUUID(), UUID.randomUUID()));
        }
        flyway("37").migrate();
    }

    @Test
    void onlyTheAccountInProductionGetsItsLotAndItsMovement() throws SQLException {
        try (Connection connection = connect();
                Statement statement = connection.createStatement();
                ResultSet rows = statement.executeQuery("""
                        SELECT g.account_id::text, g.quantity, g.remaining, p.code, m.type, m.quantity
                        FROM billing.credit_grants g
                        JOIN billing.plan_versions v ON v.id = g.plan_version_id
                        JOIN billing.plans p ON p.id = v.plan_id
                        JOIN billing.credit_movements m ON m.grant_id = g.id
                        """)) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getString(1)).isEqualTo(ACCOUNT_LIVE.toString());
            assertThat(rows.getInt(2)).isEqualTo(300);
            assertThat(rows.getInt(3)).isEqualTo(300);
            assertThat(rows.getString(4)).isEqualTo("EMPRENDEDOR");
            assertThat(rows.getString(5)).isEqualTo("GRANT");
            assertThat(rows.getInt(6)).isEqualTo(300);
            assertThat(rows.next()).isFalse();
        }
    }

    private static Flyway flyway(String target) {
        return Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .schemas("billing")
                .target(target)
                .load();
    }

    private static Connection connect() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }
}
