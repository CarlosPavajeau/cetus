package com.cantte.cetus.api.creditnotes;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.domain.dian.Hashing;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class CreditNoteResourceTest {

    @Test
    void aCancellationWithoutLinesCreditsTheWholeInvoice() {
        Issuer issuer = issuer("Cancel SAS");
        JsonPath invoice = acceptedInvoice(issuer);

        JsonPath note = create(issuer.apiKey(), cancellation(invoice.getString("id")))
                .then().statusCode(202).extract().jsonPath();

        assertThat(note.getString("number")).startsWith("NC");
        assertThat(note.getString("status")).isEqualTo("RECEIVED");
        assertThat(note.getString("concept")).isEqualTo("CANCELLATION");
        assertThat(note.getString("invoice.id")).isEqualTo(invoice.getString("id"));
        assertThat(note.getString("invoice.number")).isEqualTo(invoice.getString("number"));
        assertThat(note.getString("invoice.cufe")).isEqualTo(cufe(invoice.getString("id")));
        assertThat(note.getDouble("totals.payable")).isEqualTo(119000.0);

        JsonPath fetched = api(issuer.apiKey()).get("/v1/credit-notes/" + note.getString("id"))
                .then().statusCode(200).extract().jsonPath();
        assertThat(fetched.getString("description")).isEqualTo("Error en el valor facturado");

        JsonPath refreshed = api(issuer.apiKey()).get("/v1/invoices/" + invoice.getString("id"))
                .then().statusCode(200).extract().jsonPath();
        assertThat(refreshed.getList("creditNotes.id")).containsExactly(note.getString("id"));
        assertThat(refreshed.getDouble("balance")).isZero();
    }

    @Test
    void aPartialNoteLeavesTheRestOfTheBalance() {
        Issuer issuer = issuer("Partial SAS");
        JsonPath invoice = acceptedInvoice(issuer);

        create(issuer.apiKey(), partial(invoice.getString("id"), 50000))
                .then().statusCode(202)
                .body("concept", equalTo("PARTIAL_RETURN"))
                .body("totals.payable", equalTo(59500.0f));

        JsonPath refreshed = api(issuer.apiKey()).get("/v1/invoices/" + invoice.getString("id"))
                .then().statusCode(200).extract().jsonPath();
        assertThat(refreshed.getList("creditNotes")).hasSize(1);
        assertThat(refreshed.getDouble("balance")).isEqualTo(59500.0);
    }

    @Test
    void notesCannotCreditMoreThanTheBalance() {
        Issuer issuer = issuer("Balance SAS");
        String invoiceId = acceptedInvoice(issuer).getString("id");
        create(issuer.apiKey(), partial(invoiceId, 60000)).then().statusCode(202);

        create(issuer.apiKey(), partial(invoiceId, 50000))
                .then().statusCode(422).body("code", equalTo("credit_note_exceeds_balance"));
        create(issuer.apiKey(), cancellation(invoiceId))
                .then().statusCode(422).body("code", equalTo("credit_note_exceeds_balance"));
    }

    @Test
    void aRejectedNoteFreesItsAmount() {
        Issuer issuer = issuer("Rejected note SAS");
        String invoiceId = acceptedInvoice(issuer).getString("id");
        String first = create(issuer.apiKey(), cancellation(invoiceId)).then().statusCode(202).extract().path("id");
        setStatus(first, DocumentStatus.REJECTED);

        create(issuer.apiKey(), cancellation(invoiceId)).then().statusCode(202);
    }

    @Test
    void onlyAcceptedInvoicesCanBeCredited() {
        Issuer issuer = issuer("Pending SAS");
        String invoiceId = invoice(issuer).getString("id");

        create(issuer.apiKey(), cancellation(invoiceId))
                .then().statusCode(422).body("code", equalTo("invoice_not_accepted"));
    }

    @Test
    void anInvoiceOfAnotherAccountIsNotFound() {
        Issuer owner = issuer("Owner SAS");
        String invoiceId = acceptedInvoice(owner).getString("id");
        Issuer other = issuer("Other SAS");

        create(other.apiKey(), cancellation(invoiceId)).then().statusCode(404);
    }

    @Test
    void aNoteCannotBeCreditedAsIfItWereAnInvoice() {
        Issuer issuer = issuer("Note on note SAS");
        String invoiceId = acceptedInvoice(issuer).getString("id");
        String noteId = create(issuer.apiKey(), partial(invoiceId, 1000)).then().statusCode(202).extract().path("id");
        setStatus(noteId, DocumentStatus.ACCEPTED);

        create(issuer.apiKey(), cancellation(noteId)).then().statusCode(404);
        api(issuer.apiKey()).get("/v1/invoices/" + noteId).then().statusCode(404);
        api(issuer.apiKey()).get("/v1/credit-notes/" + invoiceId).then().statusCode(404);
    }

    @Test
    void otherConceptsNeedLines() {
        Issuer issuer = issuer("Lines SAS");
        String invoiceId = acceptedInvoice(issuer).getString("id");
        Map<String, Object> request = cancellation(invoiceId);
        request.put("concept", "REBATE");

        create(issuer.apiKey(), request)
                .then().statusCode(422).body("code", equalTo("credit_note_lines_required"));
    }

    @Test
    void withoutACreditNoteRangeTheNoteIsRefused() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "No range SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        Issuer issuer = new Issuer(issuerId, testKey(user));
        String invoiceId = acceptedInvoice(issuer).getString("id");

        create(issuer.apiKey(), cancellation(invoiceId))
                .then().statusCode(422).body("code", equalTo("no_active_numbering_range"));
    }

    @Test
    void aRetryWithTheSameKeyReturnsTheSameNote() {
        Issuer issuer = issuer("Retry SAS");
        String invoiceId = acceptedInvoice(issuer).getString("id");
        String key = UUID.randomUUID().toString();

        String first = api(issuer.apiKey()).header("Idempotency-Key", key).body(cancellation(invoiceId))
                .post("/v1/credit-notes").then().statusCode(202).extract().path("id");
        String replayed = api(issuer.apiKey()).header("Idempotency-Key", key).body(cancellation(invoiceId))
                .post("/v1/credit-notes")
                .then().statusCode(202).header("Idempotent-Replayed", "true").extract().path("id");

        assertThat(replayed).isEqualTo(first);
    }

    private record Issuer(String id, String apiKey) {
    }

    private static Issuer issuer(String name) {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, name);
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        ConsoleFixtures.addCreditNoteRange(user, issuerId);
        return new Issuer(issuerId, testKey(user));
    }

    private static JsonPath invoice(Issuer issuer) {
        Map<String, Object> invoice = Map.of(
                "issuerId", issuer.id(),
                "customer", Map.of(
                        "personType", "NATURAL_PERSON",
                        "identificationType", "CITIZEN_ID",
                        "identificationNumber", "1020304050",
                        "legalName", "Consumidor Final"),
                "payment", Map.of("method", "CASH", "meansCode", "10"),
                "lines", List.of(line(100000)));
        return api(issuer.apiKey()).header("Idempotency-Key", UUID.randomUUID().toString()).body(invoice)
                .post("/v1/invoices")
                .then().statusCode(202).extract().jsonPath();
    }

    /** An invoice as the worker leaves it once the DIAN accepts it. */
    private static JsonPath acceptedInvoice(Issuer issuer) {
        JsonPath invoice = invoice(issuer);
        String id = invoice.getString("id");
        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity doc = DocumentEntity.findById(UUID.fromString(id));
            doc.status = DocumentStatus.ACCEPTED;
            doc.cufe = cufe(id);
        });
        return invoice;
    }

    private static void setStatus(String documentId, DocumentStatus status) {
        QuarkusTransaction.requiringNew().run(() ->
                DocumentEntity.<DocumentEntity>findById(UUID.fromString(documentId)).status = status);
    }

    private static String cufe(String invoiceId) {
        return Hashing.sha384Hex("cufe-" + invoiceId);
    }

    private static Map<String, Object> cancellation(String invoiceId) {
        return new HashMap<>(Map.of(
                "invoiceId", invoiceId,
                "concept", "CANCELLATION",
                "description", "Error en el valor facturado"));
    }

    private static Map<String, Object> partial(String invoiceId, int unitPrice) {
        return new HashMap<>(Map.of(
                "invoiceId", invoiceId,
                "concept", "PARTIAL_RETURN",
                "description", "Devolución parcial",
                "lines", List.of(line(unitPrice))));
    }

    private static Map<String, Object> line(int unitPrice) {
        return Map.of("itemCode", "SERV-1", "description", "Servicio", "quantity", 1, "unitPrice", unitPrice,
                "taxes", List.of(Map.of("type", "IVA", "percent", 19)));
    }

    private static io.restassured.response.Response create(String apiKey, Map<String, Object> request) {
        return api(apiKey).header("Idempotency-Key", UUID.randomUUID().toString()).body(request)
                .post("/v1/credit-notes");
    }

    private static String testKey(ConsoleUser user) {
        return user.request().body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then().statusCode(200).extract().path("secret");
    }

    private static RequestSpecification api(String apiKey) {
        return given().header("Authorization", "Bearer " + apiKey).contentType(ContentType.JSON);
    }
}
