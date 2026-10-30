package com.cantte.cetus.api.admin;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.IssuedDocuments;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.usage.UsagePeriod;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import io.quarkus.hibernate.orm.panache.Panache;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

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

        SUPPORT.request()
                .queryParam("organizationId", customer.organizationId())
                .get("/admin/accounts")
                .then()
                .statusCode(200)
                .body("items", hasSize(1))
                .body("items[0].name", equalTo("Listada SAS"))
                .body("items[0].status", equalTo("ACTIVE"))
                .body("items[0].issuers", equalTo(1))
                .body("items[0].liveDocumentsThisMonth", equalTo(0))
                .body("items[0].recentFailures", equalTo(1))
                .body("items[0].lastFailureAt", notNullValue())
                .body("nextCursor", nullValue());

        String accountId = SUPPORT.request()
                .queryParam("organizationId", customer.organizationId())
                .get("/admin/accounts")
                .then()
                .extract()
                .path("items[0].id");
        SUPPORT.request()
                .get("/admin/accounts/" + accountId)
                .then()
                .statusCode(200)
                .body("organizationId", equalTo(customer.organizationId()))
                // The sandbox sample every account starts with, and the issuer it set up.
                .body("issuers.environment", contains("SANDBOX", "TEST"))
                .body("issuers[1].id", equalTo(issuer.id()))
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
                .get("/admin/accounts")
                .then()
                .statusCode(200)
                .body("items[0].name", equalTo("Segunda SAS"))
                .extract();
        String cursor = page.path("nextCursor");
        ADMIN.request()
                .queryParam("organizationId", first.organizationId())
                .queryParam("organizationId", second.organizationId())
                .queryParam("limit", 1)
                .queryParam("before", cursor)
                .get("/admin/accounts")
                .then()
                .statusCode(200)
                .body("items[0].name", equalTo("Primera SAS"))
                .body("nextCursor", nullValue());

        ADMIN.request()
                .queryParam("status", "DELETED")
                .get("/admin/accounts")
                .then()
                .statusCode(400);
    }

    @Test
    void anAdminSuspendsAndReactivatesAnAccount() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        IssuedDocuments.Issuer issuer = IssuedDocuments.issuer(customer, "Suspendida SAS");
        String accountId =
                customer.request().get("/console/account").then().extract().path("id");

        SUPPORT.request()
                .body(Map.of("reason", "Pago vencido"))
                .post("/admin/accounts/" + accountId + "/suspension")
                .then()
                .statusCode(403);
        ADMIN.request()
                .body(Map.of("reason", " "))
                .post("/admin/accounts/" + accountId + "/suspension")
                .then()
                .statusCode(400);

        ADMIN.request()
                .body(Map.of("reason", "  Pago vencido  "))
                .post("/admin/accounts/" + accountId + "/suspension")
                .then()
                .statusCode(200)
                .body("status", equalTo("SUSPENDED"))
                .body("statusReason", equalTo("Pago vencido"))
                .body("statusChangedBy", equalTo(ADMIN.userId()));
        ADMIN.request()
                .body(Map.of("reason", "Otra vez"))
                .post("/admin/accounts/" + accountId + "/suspension")
                .then()
                .statusCode(422)
                .body("code", equalTo("account_not_active"));
        // The billing contact hears it once, with the reason.
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() -> NotificationEntity.<NotificationEntity>list(
                                "accountId = ?1 and kind = 'ACCOUNT_SUSPENDED'", UUID.fromString(accountId))))
                .singleElement()
                .satisfies(notice -> assertThat(notice.data).containsEntry("reason", "Pago vencido"));

        // Its API keys stop working and its console turns read-only, with the reason.
        IssuedDocuments.api(issuer.apiKey())
                .get("/v1/invoices/" + UUID.randomUUID())
                .then()
                .statusCode(403)
                .body("code", equalTo("account_suspended"));
        customer.request()
                .get("/console/account")
                .then()
                .statusCode(200)
                .body("status", equalTo("SUSPENDED"))
                .body("statusReason", equalTo("Pago vencido"));
        customer.request().get("/console/issuers").then().statusCode(200);
        customer.request()
                .body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(403)
                .body("code", equalTo("account_suspended"));
        createIssuerIsRefused(customer);
        // Bootstrapping stays idempotent: it returns the account as it is.
        bootstrap(customer, "Suspendida SAS");

        ADMIN.request()
                .body(Map.of("reason", "Pagó"))
                .post("/admin/accounts/" + accountId + "/reactivation")
                .then()
                .statusCode(200)
                .body("status", equalTo("ACTIVE"));
        IssuedDocuments.api(issuer.apiKey())
                .get("/v1/invoices/" + UUID.randomUUID())
                .then()
                .statusCode(404);
        customer.request().get("/console/account").then().body("statusReason", nullValue());
        createIssuer(customer, "900777666");
        ADMIN.request()
                .body(Map.of("reason", "Pagó"))
                .post("/admin/accounts/" + accountId + "/reactivation")
                .then()
                .statusCode(422)
                .body("code", equalTo("account_not_suspended"));

        // Both changes are in the account's activity, by the admin.
        customer.request()
                .queryParam("action", "ACCOUNT_SUSPENDED")
                .get("/console/audit-log")
                .then()
                .body("items", hasSize(1))
                .body("items[0].actorType", equalTo("PLATFORM"))
                .body("items[0].actorId", equalTo(ADMIN.userId()))
                .body("items[0].ipAddress", equalTo(ConsoleUser.CLIENT_IP))
                .body("items[0].data.reason", equalTo("Pago vencido"))
                .body("items[0].data.previousStatus", equalTo("ACTIVE"));
        SUPPORT.request()
                .queryParam("accountId", accountId)
                .queryParam("action", "ACCOUNT_REACTIVATED")
                .get("/admin/audit-log")
                .then()
                .statusCode(200)
                .body("items", hasSize(1))
                .body("items[0].accountId", equalTo(accountId))
                .body("items[0].accountName", equalTo("Suspendida SAS"))
                .body("items[0].data.previousStatus", equalTo("SUSPENDED"));
    }

    @Test
    void anAdminChangesThePlanAndTheUsageIsBilledAgainstIt() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        String accountId = bootstrap(customer, "Planeada SAS");
        bill(UUID.fromString(accountId), DocumentType.INVOICE, 190);
        bill(UUID.fromString(accountId), DocumentType.CREDIT_NOTE, 13);

        ADMIN.request()
                .get("/admin/accounts/" + accountId)
                .then()
                .body("plan", equalTo("FREE"))
                .body("billableThisMonth.total", equalTo(203))
                .body("billableThisMonth.overage", equalTo(178))
                .body("billableThisMonth.costOverageCop", nullValue());
        SUPPORT.request()
                .get("/admin/plans")
                .then()
                .statusCode(200)
                .body("code", contains("FREE", "SOCIOS", "INICIAL", "CRECIMIENTO", "ESCALA"));
        SUPPORT.request()
                .body(Map.of("plan", "INICIAL", "reason", "Contrató el plan"))
                .put("/admin/accounts/" + accountId + "/plan")
                .then()
                .statusCode(403);
        ADMIN.request()
                .body(Map.of("plan", "PLATINO", "reason", "Contrató el plan"))
                .put("/admin/accounts/" + accountId + "/plan")
                .then()
                .statusCode(422)
                .body("code", equalTo("plan_unknown"));

        ADMIN.request()
                .body(Map.of("plan", "INICIAL", "reason", " Contrató el plan "))
                .put("/admin/accounts/" + accountId + "/plan")
                .then()
                .statusCode(200)
                .body("plan", equalTo("INICIAL"))
                .body("billableThisMonth.period", equalTo(UsagePeriod.current().toString()))
                .body("billableThisMonth.plan.documentsIncluded", equalTo(200))
                .body("billableThisMonth.documents.find { it.documentType == 'INVOICE' }.count", equalTo(190))
                .body("billableThisMonth.total", equalTo(203))
                .body("billableThisMonth.overage", equalTo(3))
                .body("billableThisMonth.costOverageCop", equalTo(450));
        ADMIN.request()
                .body(Map.of("plan", "INICIAL", "reason", "Otra vez"))
                .put("/admin/accounts/" + accountId + "/plan")
                .then()
                .statusCode(422)
                .body("code", equalTo("plan_unchanged"));
        SUPPORT.request()
                .queryParam("organizationId", customer.organizationId())
                .get("/admin/accounts")
                .then()
                .body("items[0].plan", equalTo("INICIAL"))
                .body("items[0].liveDocumentsThisMonth", equalTo(203));

        customer.request()
                .queryParam("action", "ACCOUNT_PLAN_CHANGED")
                .get("/console/audit-log")
                .then()
                .body("items", hasSize(1))
                .body("items[0].actorId", equalTo(ADMIN.userId()))
                .body("items[0].data.plan", equalTo("INICIAL"))
                .body("items[0].data.planPrevious", equalTo("FREE"))
                .body("items[0].data.reason", equalTo("Contrató el plan"));
    }

    @Test
    void aPlanChangeWaitsForASuspensionAndKeepsIt() throws Exception {
        ConsoleUser customer = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(customer, "Concurrente SAS"));
        CountDownLatch locked = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        // A suspension holds the account while it commits.
        CompletableFuture<Void> suspension = CompletableFuture.runAsync(() -> QuarkusTransaction.requiringNew()
                .run(() -> {
                    AccountEntity account = AccountEntity.findById(accountId, LockModeType.PESSIMISTIC_WRITE);
                    locked.countDown();
                    await(release);
                    account.status = AccountEntity.Status.SUSPENDED;
                }));
        locked.await(5, TimeUnit.SECONDS);

        // The plan change starts while the suspension holds the account, and must wait for it to commit.
        CompletableFuture.runAsync(() -> {
            try {
                Thread.sleep(300);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            release.countDown();
        });
        ADMIN.request()
                .body(Map.of("plan", "INICIAL", "reason", "Contrató el plan"))
                .put("/admin/accounts/" + accountId + "/plan")
                .then()
                .statusCode(200);
        suspension.get(5, TimeUnit.SECONDS);

        AccountEntity account = QuarkusTransaction.requiringNew().call(() -> AccountEntity.findById(accountId));
        assertThat(account.status).isEqualTo(AccountEntity.Status.SUSPENDED);
        assertThat(account.plan).isEqualTo("INICIAL");
    }

    @Test
    void closedAccountsAreNotReactivated() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        String accountId = bootstrap(customer, "Cerrada SAS");
        QuarkusTransaction.requiringNew()
                .run(() -> AccountEntity.findByOrganization(customer.organizationId())
                                .orElseThrow()
                                .status =
                        AccountEntity.Status.CLOSED);

        ADMIN.request()
                .body(Map.of("reason", "Volvió"))
                .post("/admin/accounts/" + accountId + "/reactivation")
                .then()
                .statusCode(422)
                .body("code", equalTo("account_not_suspended"));
    }

    @Test
    void unknownAccountsAreNotFound() {
        ADMIN.request().get("/admin/accounts/" + UUID.randomUUID()).then().statusCode(404);
    }

    private static void createIssuerIsRefused(ConsoleUser customer) {
        customer.request()
                .body(Map.of("environment", "TEST"))
                .post("/console/issuers")
                .then()
                .statusCode(403)
                .body("code", equalTo("account_suspended"));
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("The test never released the transaction");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    private static void bill(UUID accountId, DocumentType type, int count) {
        QuarkusTransaction.requiringNew()
                .run(() -> Panache.getEntityManager()
                        .createNativeQuery("""
                                INSERT INTO billing.usage_counters (account_id, period, document_type, count)
                                VALUES (:account, :period, :type, :count)
                                """)
                        .setParameter("account", accountId)
                        .setParameter("period", UsagePeriod.current().toString())
                        .setParameter("type", type.name())
                        .setParameter("count", count)
                        .executeUpdate());
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
