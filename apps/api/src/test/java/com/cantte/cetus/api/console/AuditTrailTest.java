package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.CERTIFICATE_PASSWORD;
import static com.cantte.cetus.api.support.ConsoleFixtures.PIN;
import static com.cantte.cetus.api.support.ConsoleFixtures.SOFTWARE_ID;
import static com.cantte.cetus.api.support.ConsoleFixtures.TECHNICAL_KEY;
import static com.cantte.cetus.api.support.ConsoleFixtures.addRange;
import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.certificateBase64;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.api.support.ConsoleFixtures.Onboarding;
import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import jakarta.inject.Inject;
import java.math.BigInteger;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

/** Every audited action writes exactly one row with the expected metadata, and never a secret. */
@QuarkusTest
class AuditTrailTest {

    @Inject
    DataSource dataSource;

    @Test
    void accountCreatedIsRecordedOnlyOnTheFirstBootstrap() throws SQLException {
        ConsoleUser user = ConsoleUser.newOrganization();
        String accountId = bootstrap(user, "Acme SAS");
        bootstrap(user, "Acme SAS");

        List<Map<String, Object>> entries = entries(user, "ACCOUNT_CREATED");
        assertThat(entries).hasSize(1);
        Map<String, Object> entry = entries.get(0);
        assertThat(entry)
                .containsEntry("actorType", "USER")
                .containsEntry("actorId", user.userId())
                .containsEntry("resourceType", "account")
                .containsEntry("resourceId", accountId)
                .containsEntry("ipAddress", ConsoleUser.CLIENT_IP);
        assertThat(data(entry)).containsEntry("name", "Acme SAS").containsKey("sandboxIssuerId");
        assertThat(userAgents(accountId)).containsOnly(ConsoleUser.CLIENT_USER_AGENT);
    }

    @Test
    void apiKeyCreationAndRevocationAreRecordedWithoutTheSecret() throws SQLException {
        ConsoleUser user = ConsoleUser.newOrganization();
        String accountId = bootstrap(user, "Keys SAS");
        JsonPath created = user.request()
                .body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        String keyId = created.getString("key.id");
        String prefix = created.getString("key.prefix");
        String secret = created.getString("secret");

        user.request().delete("/console/api-keys/" + keyId).then().statusCode(204);
        user.request().delete("/console/api-keys/" + keyId).then().statusCode(204);

        Map<String, Object> expected = Map.of("name", "ERP", "environment", "TEST", "prefix", prefix);
        List<Map<String, Object>> createdEntries = entries(user, "API_KEY_CREATED");
        assertThat(createdEntries).hasSize(1);
        assertThat(createdEntries.get(0))
                .containsEntry("resourceType", "api_key")
                .containsEntry("resourceId", keyId);
        assertThat(data(createdEntries.get(0))).isEqualTo(expected);

        List<Map<String, Object>> revokedEntries = entries(user, "API_KEY_REVOKED");
        assertThat(revokedEntries).as("revoking twice audits once").hasSize(1);
        assertThat(data(revokedEntries.get(0))).isEqualTo(expected);

        assertThat(auditedText(accountId)).doesNotContain(secret);
    }

    @Test
    void onboardingIsRecordedInOrderWithTheExpectedData() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Onboarding SAS");
        Onboarding onboarding = onboard(user);
        // A second range must not record another status change.
        addRange(user, onboarding.issuerId(), "SETT");

        List<Map<String, Object>> entries = new ArrayList<>(entries(user, null));
        Collections.reverse(entries);
        assertThat(entries)
                .extracting(entry -> entry.get("action"))
                .containsExactly(
                        "ACCOUNT_CREATED",
                        "ISSUER_CREATED",
                        "SOFTWARE_CREDENTIALS_SET",
                        "CERTIFICATE_UPLOADED",
                        "NUMBERING_RANGE_ADDED",
                        "ISSUER_STATUS_CHANGED",
                        "NUMBERING_RANGE_ADDED");
        assertThat(entries.subList(1, entries.size()))
                .allSatisfy(entry -> assertThat(entry)
                        .containsEntry("resourceType", "issuer")
                        .containsEntry("resourceId", onboarding.issuerId()));

        assertThat(data(entries.get(1)))
                .isEqualTo(Map.of("nit", "900123456", "environment", "TEST", "personType", "LEGAL_ENTITY"));
        assertThat(data(entries.get(2))).isEqualTo(Map.of("softwareId", SOFTWARE_ID, "hasTestSet", true));
        assertThat(data(entries.get(3)))
                .containsOnlyKeys("certificateId", "subject", "serialNumber", "validTo", "fingerprintSha256")
                .containsEntry("subject", "CN=Cetus Test Signer,O=Cantte,C=CO")
                .containsEntry("serialNumber", new BigInteger("a453dd6712a2743a", 16).toString());
        assertThat(data(entries.get(4)))
                .isEqualTo(Map.of(
                        "rangeId",
                        onboarding.rangeId(),
                        "documentType",
                        "INVOICE",
                        "prefix",
                        "SETP",
                        "from",
                        990000000,
                        "to",
                        995000000,
                        "validTo",
                        "2030-12-31"));
        assertThat(data(entries.get(5))).isEqualTo(Map.of("from", "ONBOARDING", "to", "TESTING"));
    }

    @Test
    void failedCertificateUploadLeavesNoAuditRow() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Wrong Password SAS");
        String issuerId = createIssuer(user);

        user.request()
                .body(Map.of("pkcs12Base64", certificateBase64(), "password", "not-the-password"))
                .put("/console/issuers/" + issuerId + "/certificate")
                .then()
                .statusCode(422);

        assertThat(entries(user, "CERTIFICATE_UPLOADED")).isEmpty();
        assertThat(entries(user, "ISSUER_STATUS_CHANGED")).isEmpty();
    }

    @Test
    void onboardingAuditNeverContainsSecrets() throws SQLException {
        ConsoleUser user = ConsoleUser.newOrganization();
        String accountId = bootstrap(user, "Secrets SAS");
        onboard(user);

        String audited = auditedText(accountId);
        assertThat(audited)
                .isNotBlank()
                .doesNotContain(PIN)
                .doesNotContain(TECHNICAL_KEY)
                .doesNotContain(CERTIFICATE_PASSWORD)
                .doesNotContain(certificateBase64().substring(0, 64));
    }

    @Test
    void invalidForwardedIpIsStoredAsNull() {
        ConsoleUser user = ConsoleUser.newOrganization();
        given().auth()
                .oauth2(user.token())
                .contentType("application/json")
                .header("X-Cetus-Client-IP", "evil.example.com")
                .body(Map.of("name", "No IP SAS"))
                .post("/console/account")
                .then()
                .statusCode(200);

        assertThat(entries(user, "ACCOUNT_CREATED"))
                .singleElement()
                .satisfies(entry -> assertThat(entry.get("ipAddress")).isNull());
    }

    static List<Map<String, Object>> entries(ConsoleUser user, String action) {
        var request = user.request().queryParam("limit", 100);
        if (action != null) {
            request.queryParam("action", action);
        }
        return request.get("/console/audit-log")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getList("items");
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> data(Map<String, Object> entry) {
        return (Map<String, Object>) entry.get("data");
    }

    /** Everything stored for the account that could leak a secret: data and user agent of every row. */
    private String auditedText(String accountId) throws SQLException {
        StringBuilder text = new StringBuilder();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement query = connection.prepareStatement(
                        "SELECT CAST(data AS text), coalesce(user_agent, '') FROM billing.audit_log WHERE account_id = ?")) {
            query.setObject(1, UUID.fromString(accountId));
            try (ResultSet rows = query.executeQuery()) {
                while (rows.next()) {
                    text.append(rows.getString(1))
                            .append('\n')
                            .append(rows.getString(2))
                            .append('\n');
                }
            }
        }
        return text.toString();
    }

    private List<String> userAgents(String accountId) throws SQLException {
        List<String> agents = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement query =
                        connection.prepareStatement("SELECT user_agent FROM billing.audit_log WHERE account_id = ?")) {
            query.setObject(1, UUID.fromString(accountId));
            try (ResultSet rows = query.executeQuery()) {
                while (rows.next()) {
                    agents.add(rows.getString(1));
                }
            }
        }
        return agents;
    }
}
