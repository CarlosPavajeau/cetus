package com.cantte.cetus.api.usage;

import static com.cantte.cetus.api.support.IssuedDocuments.api;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** A plan with a grace stops taking production documents once the month reaches its included ones plus it. */
@QuarkusTest
class PlanDocumentLimitTest {

    @Test
    void theFreePlanTakesTwentyFiveDocumentsAndFiveOfGrace() {
        PlanEntity free = QuarkusTransaction.requiringNew().call(() -> PlanEntity.findById("FREE"));

        assertThat(free.priceMonthlyCop).isZero();
        assertThat(free.documentsIncluded).isEqualTo(25);
        assertThat(free.documentsGrace).isEqualTo(5);
        assertThat(free.priceOverageCop).isNull();
        assertThat(free.issuersIncluded).isEqualTo(1);
        assertThat(free.requestsPerSecond).isEqualTo(1);
        assertThat(free.requestsBurst).isEqualTo(10);
    }

    @Test
    void documentsAboveTheGraceAreRefusedUntilARejectionGivesASlotBack() {
        Live live = live(1, 1);
        String first = invoice(live).then().statusCode(202).extract().path("id");
        invoice(live).then().statusCode(202);

        invoice(live).then().statusCode(402).body("code", equalTo("plan_document_limit"));
        debitNote(live, first).then().statusCode(402).body("code", equalTo("plan_document_limit"));

        status(first, DocumentStatus.REJECTED);
        invoice(live).then().statusCode(202);
    }

    @Test
    void theConsoleGetsTheSameCode() {
        Live live = live(1, 0);
        invoice(live).then().statusCode(202);

        live.user()
                .request()
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoiceBody(live))
                .post("/console/documents/invoices")
                .then()
                .statusCode(402)
                .body("code", equalTo("plan_document_limit"));
    }

    @Test
    void creditNotesAreTakenAboveTheLimit() {
        Live live = live(1, 0);
        String invoiceId = invoice(live).then().statusCode(202).extract().path("id");
        status(invoiceId, DocumentStatus.ACCEPTED);

        creditNote(live, invoiceId).then().statusCode(202);
        creditNote(live, invoiceId).then().statusCode(202);
    }

    @Test
    void aPlanWithoutGraceNeverRefuses() {
        Live live = live(1, null);

        invoice(live).then().statusCode(202);
        invoice(live).then().statusCode(202);
    }

    private record Live(ConsoleUser user, String issuerId, String apiKey) {}

    /** A production issuer with every range, on a plan of its own with the given documents and grace. */
    private static Live live(int included, Integer grace) {
        ConsoleUser user = ConsoleUser.newOrganization();
        String accountId = ConsoleFixtures.bootstrap(user, "Plan Limitado SAS");
        String issuerId = ConsoleFixtures.completeSetup(user, ConsoleFixtures.createIssuer(user, "900123456", "LIVE"))
                .issuerId();
        ConsoleFixtures.addCreditNoteRange(user, issuerId);
        ConsoleFixtures.addDebitNoteRange(user, issuerId);
        QuarkusTransaction.requiringNew().run(() -> {
            PlanEntity plan = new PlanEntity();
            plan.code = "TEST_" + Ids.newId();
            plan.name = "Prueba";
            plan.documentsIncluded = included;
            plan.documentsGrace = grace;
            plan.persist();
            AccountEntity.<AccountEntity>findById(UUID.fromString(accountId)).plan = plan.code;
        });
        String key = user.request()
                .body(Map.of("name", "ERP", "environment", "LIVE"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("secret");
        return new Live(user, issuerId, key);
    }

    private static Response invoice(Live live) {
        return create(live, "/v1/invoices", invoiceBody(live));
    }

    private static Map<String, Object> invoiceBody(Live live) {
        return Map.of(
                "issuerId", live.issuerId(),
                "customer",
                        Map.of(
                                "personType", "NATURAL_PERSON",
                                "identificationType", "CITIZEN_ID",
                                "identificationNumber", "1020304050",
                                "legalName", "Consumidor Final"),
                "payment", Map.of("method", "CASH", "meansCode", "10"),
                "lines", List.of(line(1000)));
    }

    private static Response creditNote(Live live, String invoiceId) {
        return create(
                live,
                "/v1/credit-notes",
                Map.of(
                        "invoiceId",
                        invoiceId,
                        "concept",
                        "PARTIAL_RETURN",
                        "description",
                        "Devolución parcial",
                        "lines",
                        List.of(line(100))));
    }

    private static Response debitNote(Live live, String invoiceId) {
        status(invoiceId, DocumentStatus.ACCEPTED);
        return create(
                live,
                "/v1/debit-notes",
                Map.of(
                        "invoiceId",
                        invoiceId,
                        "concept",
                        "INTEREST",
                        "description",
                        "Intereses de mora",
                        "lines",
                        List.of(line(100))));
    }

    private static Response create(Live live, String path, Map<String, Object> body) {
        return api(live.apiKey())
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(body)
                .post(path);
    }

    private static Map<String, Object> line(int unitPrice) {
        return Map.of(
                "itemCode",
                "SERV-1",
                "description",
                "Servicio",
                "quantity",
                1,
                "unitPrice",
                unitPrice,
                "taxes",
                List.of(Map.of("type", "IVA", "percent", 19)));
    }

    private static void status(String documentId, DocumentStatus status) {
        QuarkusTransaction.requiringNew()
                .run(() -> DocumentEntity.<DocumentEntity>findById(UUID.fromString(documentId)).status = status);
    }
}
