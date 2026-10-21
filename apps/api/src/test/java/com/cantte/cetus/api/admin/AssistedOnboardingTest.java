package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static com.cantte.cetus.api.support.ConsoleFixtures.CERTIFICATE_PASSWORD;
import static com.cantte.cetus.api.support.ConsoleFixtures.PIN;
import static com.cantte.cetus.api.support.ConsoleFixtures.SOFTWARE_ID;
import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.certificateBase64;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

/** The Cetus team sets up an issuer for a customer; the certificate comes from the customer through a link. */
@QuarkusTest
class AssistedOnboardingTest {

    private static final ConsoleUser SUPPORT = ConsoleUser.platformStaff(PlatformRoles.SUPPORT);

    @Test
    void supportSetsTheSoftwareAndARangeAsThemselves() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        String accountId = bootstrap(customer, "Asistida SAS");
        String issuerId = createIssuer(customer);
        String base = "/admin/accounts/" + accountId + "/issuers/" + issuerId;

        customer.request().get(base).then().statusCode(403);
        SUPPORT.request().body(Map.of("softwareId", SOFTWARE_ID, "pin", PIN)).put(base + "/software")
                .then().statusCode(200).body("software.softwareId", equalTo(SOFTWARE_ID));
        SUPPORT.request().body(Map.of("documentType", "INVOICE", "prefix", "SETP", "from", 990000000,
                        "to", 995000000, "technicalKey", "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c"))
                .post(base + "/numbering-ranges").then().statusCode(200).body("prefix", equalTo("SETP"));
        SUPPORT.request().get(base).then().statusCode(200).body("ranges", hasSize(1));

        customer.request().queryParam("action", "SOFTWARE_CREDENTIALS_SET").get("/console/audit-log").then()
                .body("items[0].actorType", equalTo("PLATFORM"))
                .body("items[0].actorId", equalTo(SUPPORT.userId()));
        // Another account's issuer is not reachable through this account.
        String otherAccount = bootstrap(ConsoleUser.newOrganization(), "Otra SAS");
        SUPPORT.request().get("/admin/accounts/" + otherAccount + "/issuers/" + issuerId).then().statusCode(404);
    }

    @Test
    void aLinkUploadsTheCertificateOnceAndAWrongPasswordDoesNotSpendIt() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        String accountId = bootstrap(customer, "Enlace SAS");
        String issuerId = createIssuer(customer, "900111222");
        String links = "/admin/accounts/" + accountId + "/issuers/" + issuerId + "/certificate-upload-links";

        String token = SUPPORT.request().post(links).then().statusCode(200)
                .body("expiresAt", notNullValue()).extract().path("token");
        String page = "/console/certificate-uploads/" + token;

        given().get(page).then().statusCode(200)
                .body("legalName", equalTo("Acme SAS")).body("nit", equalTo("900111222"));
        given().contentType(ContentType.JSON)
                .body(Map.of("pkcs12Base64", certificateBase64(), "password", "no-es-esta"))
                .put(page).then().statusCode(422).body("code", equalTo("certificate_invalid"));
        given().get(page).then().statusCode(200);

        given().contentType(ContentType.JSON)
                .body(Map.of("pkcs12Base64", certificateBase64(), "password", CERTIFICATE_PASSWORD))
                .put(page).then().statusCode(200).body("subject", notNullValue());
        given().get(page).then().statusCode(404);
        given().contentType(ContentType.JSON)
                .body(Map.of("pkcs12Base64", certificateBase64(), "password", CERTIFICATE_PASSWORD))
                .put(page).then().statusCode(404);

        customer.request().get("/console/issuers/" + issuerId).then().body("certificate.subject", notNullValue());
        customer.request().queryParam("action", "CERTIFICATE_UPLOADED").get("/console/audit-log").then()
                .body("items", hasSize(1))
                .body("items[0].actorType", equalTo("SYSTEM"));
        customer.request().queryParam("action", "CERTIFICATE_UPLOAD_LINK_CREATED").get("/console/audit-log").then()
                .body("items", hasSize(1))
                .body("items[0].actorId", equalTo(SUPPORT.userId()));
        // The certificate never comes back: only its metadata.
        String detail = SUPPORT.request().get("/admin/accounts/" + accountId + "/issuers/" + issuerId)
                .then().extract().asString();
        assertThat(detail).doesNotContain(certificateBase64().substring(0, 40)).doesNotContain(CERTIFICATE_PASSWORD);
    }

    /**
     * Creating a link expires the issuer's earlier ones; two creations at once must not both survive, so
     * a creation waits for whoever holds the issuer. Checked by holding its lock from another transaction.
     */
    @Test
    void linkCreationWaitsForOthersOnTheSameIssuer() throws Exception {
        ConsoleUser customer = ConsoleUser.newOrganization();
        String accountId = bootstrap(customer, "Concurrente SAS");
        String issuerId = createIssuer(customer);
        String links = "/admin/accounts/" + accountId + "/issuers/" + issuerId + "/certificate-upload-links";
        String earlier = SUPPORT.request().post(links).then().extract().path("token");

        CountDownLatch held = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            CompletableFuture<Void> holder = CompletableFuture.runAsync(() -> QuarkusTransaction.requiringNew().run(() -> {
                IssuerEntity.findForAccountForUpdate(UUID.fromString(accountId), UUID.fromString(issuerId))
                        .orElseThrow();
                held.countDown();
                try {
                    release.await(10, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    throw new IllegalStateException(e);
                }
            }), pool);
            assertThat(held.await(10, TimeUnit.SECONDS)).isTrue();

            CompletableFuture<String> creation = CompletableFuture.supplyAsync(() ->
                    SUPPORT.request().post(links).then().statusCode(200).extract().<String>path("token"), pool);
            Thread.sleep(1_000);
            assertThat(creation).as("waits while another transaction holds the issuer").isNotDone();

            release.countDown();
            holder.get(10, TimeUnit.SECONDS);
            String latest = creation.get(10, TimeUnit.SECONDS);
            given().get("/console/certificate-uploads/" + latest).then().statusCode(200);
            given().get("/console/certificate-uploads/" + earlier).then().statusCode(404);
        } finally {
            release.countDown();
            pool.shutdownNow();
        }
    }

    @Test
    void aNewLinkReplacesTheEarlierOne() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        String accountId = bootstrap(customer, "Reemplazo SAS");
        String issuerId = createIssuer(customer);
        String links = "/admin/accounts/" + accountId + "/issuers/" + issuerId + "/certificate-upload-links";

        String first = SUPPORT.request().post(links).then().extract().path("token");
        String second = SUPPORT.request().post(links).then().extract().path("token");

        given().get("/console/certificate-uploads/" + first).then().statusCode(404);
        given().get("/console/certificate-uploads/" + second).then().statusCode(200);
        given().get("/console/certificate-uploads/not-a-token").then().statusCode(400);
        given().get("/console/certificate-uploads/" + "A".repeat(43)).then().statusCode(404);
        given().header("Host", "cetus-api.cantte.com").get("/console/certificate-uploads/" + second)
                .then().statusCode(404).body("code", equalTo("not_found"));
    }
}
