package com.cantte.cetus.api.nativeimage;

import static com.cantte.cetus.api.nativeimage.NativeClient.CERTIFICATE_PASSWORD;
import static com.cantte.cetus.api.nativeimage.NativeClient.api;
import static com.cantte.cetus.api.nativeimage.NativeClient.bootstrap;
import static com.cantte.cetus.api.nativeimage.NativeClient.createIssuer;
import static com.cantte.cetus.api.nativeimage.NativeClient.pkcs12;
import static com.cantte.cetus.api.nativeimage.NativeClient.uploadCertificate;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.nativeimage.NativeClient.ConsoleUser;
import com.cantte.cetus.aws.LocalStackSecrets;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusIntegrationTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * What the native binary must do as the JVM build does, against real Postgres, KMS and S3: the paths that use
 * reflection, resources or JDK security providers. The full suite keeps running on the JVM.
 */
@QuarkusIntegrationTest
@QuarkusTestResource(NativeStack.class)
class NativeApiIT {

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void reportsHealthy() {
        given().get("/q/health/ready").then().statusCode(200).body("status", equalTo("UP"));
        given().get("/q/health/live").then().statusCode(200).body("status", equalTo("UP"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"test-signer", "openssl-default", "openssl-3des", "openssl-legacy-rc2"})
    void opensTheUsualCertificates(String file) {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Certificate " + file);
        String issuerId = createIssuer(user);

        uploadCertificate(user, pkcs12(file), CERTIFICATE_PASSWORD)
                .put("/console/issuers/" + issuerId + "/certificate")
                .then()
                .statusCode(200);
    }

    @Test
    void refusesACertificateWithTooManyIterations() {
        assertRefused(pkcs12("openssl-1m"), CERTIFICATE_PASSWORD, "too many key derivations");
    }

    @Test
    void refusesAWrongPasswordAndACorruptFile() {
        byte[] corrupt = "not a PKCS#12 file".getBytes(StandardCharsets.UTF_8);

        assertRefused(pkcs12("openssl-default"), "not-the-password", "check the file and its password");
        assertRefused(corrupt, CERTIFICATE_PASSWORD, "not a valid PKCS#12");
    }

    @Test
    void sealsTheCertificateSoTheJvmOpensIt() throws SQLException {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Sealed SAS");
        String issuerId = createIssuer(user);
        byte[] pkcs12 = pkcs12("openssl-default");

        uploadCertificate(user, pkcs12, CERTIFICATE_PASSWORD)
                .put("/console/issuers/" + issuerId + "/certificate")
                .then()
                .statusCode(200);

        try (Connection db = database();
                PreparedStatement query = db.prepareStatement("""
                        SELECT s3_key, password_sealed FROM billing.signing_certificates
                        WHERE issuer_id = ? AND active""");
                LocalStackSecrets secrets = new LocalStackSecrets(NativeStack.localStackUrl())) {
            query.setObject(1, UUID.fromString(issuerId));
            try (ResultSet row = query.executeQuery()) {
                assertThat(row.next()).isTrue();
                assertThat(secrets.openObject(row.getString("s3_key"))).isEqualTo(pkcs12);
                assertThat(secrets.openText(row.getBytes("password_sealed"))).isEqualTo(CERTIFICATE_PASSWORD);
            }
        }
    }

    @Test
    void issuesAnInvoiceAndQueuesItForTheWorker() throws SQLException {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Issuance SAS");
        String issuerId = createIssuer(user);
        user.request()
                .body(Map.of(
                        "softwareId",
                        UUID.randomUUID().toString(),
                        "pin",
                        "12345",
                        "testSetId",
                        UUID.randomUUID().toString()))
                .put("/console/issuers/" + issuerId + "/software")
                .then()
                .statusCode(200);
        uploadCertificate(user, pkcs12("test-signer"), CERTIFICATE_PASSWORD)
                .put("/console/issuers/" + issuerId + "/certificate")
                .then()
                .statusCode(200);
        user.request()
                .body(Map.of(
                        "documentType", "INVOICE",
                        "resolutionNumber", "18760000001",
                        "resolutionDate", "2026-01-01",
                        "prefix", "SETP",
                        "from", 990000000,
                        "to", 995000000,
                        "validFrom", "2026-01-01",
                        "validTo", "2030-12-31",
                        "technicalKey", "tk-native-test"))
                .post("/console/issuers/" + issuerId + "/numbering-ranges")
                .then()
                .statusCode(200);
        String apiKey = user.request()
                .body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("secret");

        String documentId = api(apiKey)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoice(issuerId))
                .post("/v1/invoices")
                .then()
                .statusCode(202)
                .extract()
                .path("id");

        api(apiKey).get("/v1/invoices/" + documentId).then().statusCode(200).body("id", equalTo(documentId));
        try (Connection db = database();
                PreparedStatement query = db.prepareStatement(
                        "SELECT count(*) FROM billing.jobs WHERE job_type = 'PROCESS_DOCUMENT' AND reference_id = ?")) {
            query.setObject(1, UUID.fromString(documentId));
            try (ResultSet row = query.executeQuery()) {
                assertThat(row.next()).isTrue();
                assertThat(row.getInt(1)).isEqualTo(1);
            }
        }
    }

    @Test
    void refusesAConsoleTokenSignedWithAnotherKey() {
        ConsoleUser user = ConsoleUser.newOrganization();

        user.requestSignedByAnotherKey().get("/console/account").then().statusCode(401);
    }

    record EmailData(@JsonProperty("email_id") String emailId, List<String> to) {}

    record EmailEvent(
            String type, @JsonProperty("created_at") String createdAt, EmailData data) {}

    @Test
    void acceptsOnlySignedResendEvents() throws Exception {
        String body = json.writeValueAsString(new EmailEvent(
                "email.bounced",
                "2026-11-17T10:00:00Z",
                new EmailData(UUID.randomUUID().toString(), List.of("cliente@example.com"))));
        String svixId = "msg_" + UUID.randomUUID();
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);

        emailEvent(svixId, timestamp, sign(svixId, timestamp, body), body)
                .then()
                .statusCode(200);
        emailEvent(svixId, timestamp, sign(svixId, timestamp, body.replace("bounced", "delivered")), body)
                .then()
                .statusCode(401)
                .body("code", equalTo("invalid_signature"));
    }

    private static void assertRefused(byte[] pkcs12, String password, String message) {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Refused SAS");
        String issuerId = createIssuer(user);

        uploadCertificate(user, pkcs12, password)
                .put("/console/issuers/" + issuerId + "/certificate")
                .then()
                .statusCode(422)
                .body("code", equalTo("certificate_invalid"))
                .body("detail", containsString(message));
    }

    private static Response emailEvent(String svixId, String timestamp, String signature, String body) {
        return given().contentType(ContentType.JSON)
                .header("svix-id", svixId)
                .header("svix-timestamp", timestamp)
                .header("svix-signature", "v1," + signature)
                .body(body)
                .post("/internal/email-events");
    }

    private static String sign(String svixId, String timestamp, String body) throws Exception {
        String secret = NativeStack.WEBHOOK_SECRET.substring("whsec_".length());
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(Base64.getDecoder().decode(secret), "HmacSHA256"));
        byte[] signature = mac.doFinal((svixId + "." + timestamp + "." + body).getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(signature);
    }

    private static Map<String, Object> invoice(String issuerId) {
        return Map.of(
                "issuerId", issuerId,
                "customer",
                        Map.of(
                                "personType", "NATURAL_PERSON",
                                "identificationType", "CITIZEN_ID",
                                "identificationNumber", "1020304050",
                                "legalName", "Consumidor Final"),
                "payment", Map.of("method", "CASH", "meansCode", "10"),
                "lines",
                        List.of(Map.of(
                                "itemCode",
                                "SERV-1",
                                "description",
                                "Servicio",
                                "quantity",
                                1,
                                "unitPrice",
                                100000,
                                "taxes",
                                List.of(Map.of("type", "IVA", "percent", 19)))));
    }

    private static Connection database() throws SQLException {
        return DriverManager.getConnection(NativeStack.jdbcUrl(), "cetus_billing", "cetus");
    }
}
