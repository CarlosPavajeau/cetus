package com.cantte.cetus.api.admin;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.persistence.entity.AccountEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.specification.RequestSpecification;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** A Cetus admin acting as a console user: recorded on the account, and kept away from credentials. */
@QuarkusTest
class ImpersonationTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);

    @Test
    void theStartIsRecordedOnTheAccountByAnAdmin() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        String accountId = bootstrap(customer, "Asistida SAS");
        Map<String, Object> start = start(customer, accountId);

        ConsoleUser.platformStaff(PlatformRoles.SUPPORT)
                .request()
                .body(start)
                .post("/admin/impersonations")
                .then()
                .statusCode(403);
        ADMIN.request()
                .body(Map.of(
                        "userId",
                        customer.userId(),
                        "email",
                        "dueno@asistida.test",
                        "accountId",
                        UUID.randomUUID(),
                        "reason",
                        "Soporte",
                        "expiresAt",
                        "2026-10-21T12:00:00Z"))
                .post("/admin/impersonations")
                .then()
                .statusCode(404);
        ADMIN.request().body(start).post("/admin/impersonations").then().statusCode(204);

        customer.request()
                .queryParam("action", "IMPERSONATION_STARTED")
                .get("/console/audit-log")
                .then()
                .body("items", hasSize(1))
                .body("items[0].actorType", equalTo("PLATFORM"))
                .body("items[0].actorId", equalTo(ADMIN.userId()))
                .body("items[0].data.userId", equalTo(customer.userId()))
                .body("items[0].data.reason", equalTo("El cliente no encuentra su factura"));
    }

    @Test
    void whileImpersonatingCredentialsAreOffLimitsAndActionsNameTheAdmin() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        bootstrap(customer, "Suplantada SAS");
        String issuerId = createIssuer(customer);

        customer.impersonatedBy(ADMIN.userId())
                .body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(403)
                .body("code", equalTo("impersonation_forbidden"));
        customer.impersonatedBy(ADMIN.userId())
                .body(Map.of(
                        "pkcs12Base64",
                        ConsoleFixtures.certificateBase64(),
                        "password",
                        ConsoleFixtures.CERTIFICATE_PASSWORD))
                .put("/console/issuers/" + issuerId + "/certificate")
                .then()
                .statusCode(403)
                .body("code", equalTo("impersonation_forbidden"));
        customer.impersonatedBy(ADMIN.userId())
                .delete("/console/api-keys/" + UUID.randomUUID())
                .then()
                .statusCode(403);
        customer.impersonatedBy(ADMIN.userId())
                .body(Map.of("planVersionId", UUID.randomUUID()))
                .post("/console/orders")
                .then()
                .statusCode(403)
                .body("code", equalTo("impersonation_forbidden"));
        customer.impersonatedBy(ADMIN.userId())
                .body(Map.of())
                .put("/console/billing-profile")
                .then()
                .statusCode(403)
                .body("code", equalTo("impersonation_forbidden"));
        customer.impersonatedBy(ADMIN.userId()).get("/console/issuers").then().statusCode(200);

        // Other changes go through, recorded as the user's with the admin next to them.
        createIssuerAs(customer.impersonatedBy(ADMIN.userId()), "900555444");
        customer.request()
                .queryParam("action", "ISSUER_CREATED")
                .get("/console/audit-log")
                .then()
                .body("items", hasSize(2))
                .body("items[0].actorType", equalTo("USER"))
                .body("items[0].actorId", equalTo(customer.userId()))
                .body("items[0].impersonatedBy", equalTo(ADMIN.userId()))
                .body("items[1].impersonatedBy", nullValue());
        ADMIN.request()
                .queryParam("actorId", ADMIN.userId())
                .queryParam("action", "ISSUER_CREATED")
                .get("/admin/audit-log")
                .then()
                .body("items", hasSize(1));

        // The customer's own session is not limited.
        customer.request()
                .body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(200);
    }

    @Test
    void theEndIsRecordedFromTheImpersonationSessionEvenOnASuspendedAccount() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        bootstrap(customer, "Terminada SAS");
        QuarkusTransaction.requiringNew()
                .run(() -> AccountEntity.findByOrganization(customer.organizationId())
                                .orElseThrow()
                                .status =
                        AccountEntity.Status.SUSPENDED);

        customer.request().post("/console/impersonation/end").then().statusCode(403);
        customer.impersonatedBy(ADMIN.userId())
                .post("/console/impersonation/end")
                .then()
                .statusCode(204);

        customer.request()
                .queryParam("action", "IMPERSONATION_ENDED")
                .get("/console/audit-log")
                .then()
                .body("items", hasSize(1))
                .body("items[0].actorType", equalTo("PLATFORM"))
                .body("items[0].actorId", equalTo(ADMIN.userId()))
                .body("items[0].data.userId", equalTo(customer.userId()));
    }

    private static Map<String, Object> start(ConsoleUser customer, String accountId) {
        return Map.of(
                "userId",
                customer.userId(),
                "email",
                "dueno@asistida.test",
                "accountId",
                accountId,
                "reason",
                "El cliente no encuentra su factura",
                "expiresAt",
                "2026-10-21T12:00:00Z");
    }

    private static void createIssuerAs(RequestSpecification request, String nit) {
        request.body(Map.of(
                        "environment",
                        "TEST",
                        "nit",
                        nit,
                        "legalName",
                        "Otra SAS",
                        "personType",
                        "LEGAL_ENTITY",
                        "taxLevelCodes",
                        List.of("O-13"),
                        "responsibleForIva",
                        true,
                        "address",
                        Map.of(
                                "municipalityCode",
                                "11001",
                                "cityName",
                                "Bogotá",
                                "departmentCode",
                                "11",
                                "departmentName",
                                "Bogotá",
                                "postalCode",
                                "110111",
                                "line",
                                "Calle 1 # 2-3",
                                "countryCode",
                                "CO",
                                "countryName",
                                "Colombia"),
                        "email",
                        "facturas@otra.test"))
                .post("/console/issuers")
                .then()
                .statusCode(200);
    }
}
