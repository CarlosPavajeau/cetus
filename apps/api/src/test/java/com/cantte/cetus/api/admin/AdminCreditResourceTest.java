package com.cantte.cetus.api.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.IssuedDocuments;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.CreditReservationEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import io.restassured.response.Response;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** The Cetus team reads an account's credits, grants and adjusts them with a reason, and resolves dead documents. */
@QuarkusTest
class AdminCreditResourceTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);
    private static final ConsoleUser SUPPORT = ConsoleUser.platformStaff(PlatformRoles.SUPPORT);

    @Test
    void anAdminGrantsACourtesyPackageThatCountsAsTheProduct() {
        UUID accountId = account("Cortesía SAS");
        Map<String, Object> grant = Map.of(
                "planVersionId",
                versionOf("EMPRENDEDOR"),
                "quantity",
                50,
                "expiresAt",
                OffsetDateTime.now().plusMonths(3).toString(),
                "reason",
                "Cortesía de lanzamiento");

        SUPPORT.request().body(grant).post(path(accountId, "/grants")).then().statusCode(403);
        JsonPath credits = ADMIN.request()
                .body(grant)
                .post(path(accountId, "/grants"))
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();

        assertThat(credits.getBoolean("product")).isTrue();
        assertThat(credits.getInt("issuersIncluded")).isEqualTo(1);
        assertThat(credits.getInt("available")).isEqualTo(50);
        assertThat(credits.getInt("graceMargin")).isEqualTo(10);
        assertThat(credits.getString("grants[0].sourceType")).isEqualTo("PROMO");
        assertThat(credits.getString("movements[0].reason")).isEqualTo("Cortesía de lanzamiento");
        SUPPORT.request().get(path(accountId, "")).then().statusCode(200).body("available", equalTo(50));
    }

    @Test
    void anAdjustmentAddsOrTakesCreditsButNeverMoreThanThereAre() {
        UUID accountId = account("Ajustada SAS");

        adjust(accountId, 10, null).then().statusCode(422).body("code", equalTo("adjustment_expiry_required"));
        adjust(accountId, 10, OffsetDateTime.now().plusMonths(1))
                .then()
                .statusCode(200)
                .body("available", equalTo(10))
                .body("product", equalTo(false));
        adjust(accountId, -4, null).then().statusCode(200).body("available", equalTo(6));
        adjust(accountId, -7, null).then().statusCode(422).body("code", equalTo("adjustment_exceeds_balance"));
    }

    @Test
    void aDocumentWhoseProcessingDiedIsResolvedAsNotIssued() {
        ConsoleUser user = ConsoleUser.newOrganization();
        IssuedDocuments.Issuer issuer = IssuedDocuments.liveIssuer(user, "Muerta SAS");
        UUID documentId = IssuedDocuments.invoice(issuer);
        Map<String, String> reason = Map.of("reason", "La DIAN nunca recibió el documento");

        ADMIN.request()
                .body(reason)
                .post("/admin/documents/" + documentId + "/credit-release")
                .then()
                .statusCode(422)
                .body("code", equalTo("document_not_dead"));

        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity.<DocumentEntity>findById(documentId).status = DocumentStatus.FAILED;
            JobEntity.update(
                    "status = 'DEAD' where jobType = ?1 and referenceId = ?2", JobTypes.PROCESS_DOCUMENT, documentId);
        });
        SUPPORT.request()
                .body(reason)
                .post("/admin/documents/" + documentId + "/credit-release")
                .then()
                .statusCode(200)
                .body("available", equalTo(1000));

        CreditReservationEntity reservation = QuarkusTransaction.requiringNew()
                .call(() -> CreditReservationEntity.listByDocument(documentId).getFirst());
        assertThat(reservation.status).isEqualTo(CreditReservationEntity.Status.RELEASED);
        ADMIN.request()
                .body(Map.of("reason", "Otra vez"))
                .post("/admin/documents/" + Ids.newId() + "/credit-release")
                .then()
                .statusCode(404);
    }

    private static Response adjust(UUID accountId, int quantity, OffsetDateTime expiresAt) {
        Map<String, Object> body = new HashMap<>(Map.of("quantity", quantity, "reason", "Corrección de saldo"));
        if (expiresAt != null) {
            body.put("expiresAt", expiresAt.toString());
        }
        return ADMIN.request().body(body).post(path(accountId, "/adjustments"));
    }

    private static UUID account(String name) {
        ConsoleUser user = ConsoleUser.newOrganization();
        return UUID.fromString(ConsoleFixtures.bootstrap(user, name));
    }

    private static String path(UUID accountId, String rest) {
        return "/admin/accounts/" + accountId + "/credits" + rest;
    }

    private static String versionOf(String planCode) {
        return QuarkusTransaction.requiringNew()
                .call(() -> PlanVersionEntity.findCurrent(PlanEntity.byCode(planCode).id, null, OffsetDateTime.now())
                        .orElseThrow()
                        .id
                        .toString());
    }
}
