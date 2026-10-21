package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.IssuedDocuments;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class AdminAccountResourceTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);
    private static final ConsoleUser SUPPORT = ConsoleUser.platformStaff(PlatformRoles.SUPPORT);

    @Test
    void onlyPlatformStaffReadAccounts() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        String accountId = bootstrap(customer, "Curiosa SAS");

        customer.request().get("/admin/accounts").then().statusCode(403);
        customer.request().get("/admin/accounts/" + accountId).then().statusCode(403);
        SUPPORT.request().get("/admin/accounts/" + accountId).then().statusCode(200);
    }

    @Test
    void listsAccountsWithTheirIssuersUsageAndFailures() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        IssuedDocuments.Issuer issuer = IssuedDocuments.issuer(customer, "Listada SAS");
        UUID rejected = IssuedDocuments.invoice(issuer);
        reject(rejected, List.of("Regla: FAD06, Rechazo: El NIT del emisor no es válido"));
        IssuedDocuments.invoice(issuer);

        SUPPORT.request().queryParam("organizationId", customer.organizationId())
                .get("/admin/accounts").then()
                .statusCode(200)
                .body("items", hasSize(1))
                .body("items[0].name", equalTo("Listada SAS"))
                .body("items[0].status", equalTo("ACTIVE"))
                .body("items[0].issuers", equalTo(1))
                .body("items[0].liveDocumentsThisMonth", equalTo(0))
                .body("items[0].recentFailures", equalTo(1))
                .body("items[0].lastFailureAt", notNullValue())
                .body("nextCursor", nullValue());

        String accountId = SUPPORT.request().queryParam("organizationId", customer.organizationId())
                .get("/admin/accounts").then().extract().path("items[0].id");
        SUPPORT.request().get("/admin/accounts/" + accountId).then()
                .statusCode(200)
                .body("organizationId", equalTo(customer.organizationId()))
                .body("issuers", hasSize(1))
                .body("issuers[0].id", equalTo(issuer.id()))
                .body("usageThisMonth.find { it.status == 'RECEIVED' }.count", equalTo(1))
                .body("usageThisMonth.find { it.status == 'REJECTED' }.count", equalTo(1))
                .body("recentFailures", hasSize(1))
                .body("recentFailures[0].id", equalTo(rejected.toString()))
                .body("recentFailures[0].dianErrors", contains(containsString("FAD06")));
    }

    @Test
    void listsAPageAtATime() {
        ConsoleUser first = ConsoleUser.newOrganization();
        ConsoleUser second = ConsoleUser.newOrganization();
        bootstrap(first, "Primera SAS");
        bootstrap(second, "Segunda SAS");

        var page = ADMIN.request()
                .queryParam("organizationId", first.organizationId())
                .queryParam("organizationId", second.organizationId())
                .queryParam("limit", 1)
                .get("/admin/accounts").then().statusCode(200)
                .body("items[0].name", equalTo("Segunda SAS"))
                .extract();
        String cursor = page.path("nextCursor");
        ADMIN.request()
                .queryParam("organizationId", first.organizationId())
                .queryParam("organizationId", second.organizationId())
                .queryParam("limit", 1)
                .queryParam("before", cursor)
                .get("/admin/accounts").then().statusCode(200)
                .body("items[0].name", equalTo("Primera SAS"))
                .body("nextCursor", nullValue());

        ADMIN.request().queryParam("status", "DELETED").get("/admin/accounts").then().statusCode(400);
    }

    @Test
    void anAdminSuspendsAndReactivatesAnAccount() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        IssuedDocuments.Issuer issuer = IssuedDocuments.issuer(customer, "Suspendida SAS");
        String accountId = customer.request().get("/console/account").then().extract().path("id");

        SUPPORT.request().body(Map.of("reason", "Pago vencido")).post("/admin/accounts/" + accountId + "/suspension")
                .then().statusCode(403);
        ADMIN.request().body(Map.of("reason", " ")).post("/admin/accounts/" + accountId + "/suspension")
                .then().statusCode(400);

        ADMIN.request().body(Map.of("reason", "  Pago vencido  ")).post("/admin/accounts/" + accountId + "/suspension")
                .then().statusCode(200)
                .body("status", equalTo("SUSPENDED"))
                .body("statusReason", equalTo("Pago vencido"))
                .body("statusChangedBy", equalTo(ADMIN.userId()));
        ADMIN.request().body(Map.of("reason", "Otra vez")).post("/admin/accounts/" + accountId + "/suspension")
                .then().statusCode(422).body("code", equalTo("account_not_active"));

        // Its API keys stop working and its console turns read-only, with the reason.
        IssuedDocuments.api(issuer.apiKey()).get("/v1/invoices/" + UUID.randomUUID()).then()
                .statusCode(403).body("code", equalTo("account_suspended"));
        customer.request().get("/console/account").then().statusCode(200)
                .body("status", equalTo("SUSPENDED")).body("statusReason", equalTo("Pago vencido"));
        customer.request().get("/console/issuers").then().statusCode(200);
        customer.request().body(Map.of("name", "ERP", "environment", "TEST")).post("/console/api-keys")
                .then().statusCode(403).body("code", equalTo("account_suspended"));
        createIssuerIsRefused(customer);
        // Bootstrapping stays idempotent: it returns the account as it is.
        bootstrap(customer, "Suspendida SAS");

        ADMIN.request().body(Map.of("reason", "Pagó")).post("/admin/accounts/" + accountId + "/reactivation")
                .then().statusCode(200).body("status", equalTo("ACTIVE"));
        IssuedDocuments.api(issuer.apiKey()).get("/v1/invoices/" + UUID.randomUUID()).then().statusCode(404);
        customer.request().get("/console/account").then().body("statusReason", nullValue());
        createIssuer(customer, "900777666");
        ADMIN.request().body(Map.of("reason", "Pagó")).post("/admin/accounts/" + accountId + "/reactivation")
                .then().statusCode(422).body("code", equalTo("account_not_suspended"));

        // Both changes are in the account's activity, by the admin.
        customer.request().queryParam("action", "ACCOUNT_SUSPENDED").get("/console/audit-log").then()
                .body("items", hasSize(1))
                .body("items[0].actorType", equalTo("PLATFORM"))
                .body("items[0].actorId", equalTo(ADMIN.userId()))
                .body("items[0].ipAddress", equalTo(ConsoleUser.CLIENT_IP))
                .body("items[0].data.reason", equalTo("Pago vencido"))
                .body("items[0].data.previousStatus", equalTo("ACTIVE"));
        SUPPORT.request().queryParam("accountId", accountId).queryParam("action", "ACCOUNT_REACTIVATED")
                .get("/admin/audit-log").then().statusCode(200)
                .body("items", hasSize(1))
                .body("items[0].accountId", equalTo(accountId))
                .body("items[0].accountName", equalTo("Suspendida SAS"))
                .body("items[0].data.previousStatus", equalTo("SUSPENDED"));
    }

    @Test
    void closedAccountsAreNotReactivated() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        String accountId = bootstrap(customer, "Cerrada SAS");
        QuarkusTransaction.requiringNew().run(() ->
                AccountEntity.findByOrganization(customer.organizationId())
                        .orElseThrow().status = "CLOSED");

        ADMIN.request().body(Map.of("reason", "Volvió")).post("/admin/accounts/" + accountId + "/reactivation")
                .then().statusCode(422).body("code", equalTo("account_not_suspended"));
    }

    @Test
    void unknownAccountsAreNotFound() {
        ADMIN.request().get("/admin/accounts/" + UUID.randomUUID()).then().statusCode(404);
    }

    private static void createIssuerIsRefused(ConsoleUser customer) {
        customer.request().body(Map.of("environment", "TEST")).post("/console/issuers")
                .then().statusCode(403).body("code", equalTo("account_suspended"));
    }

    private static void reject(UUID documentId, List<String> errors) {
        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity document = DocumentEntity.findById(documentId);
            document.status = DocumentStatus.REJECTED;
            document.dianStatusCode = "99";
            document.dianErrors = errors;
        });
    }
}
