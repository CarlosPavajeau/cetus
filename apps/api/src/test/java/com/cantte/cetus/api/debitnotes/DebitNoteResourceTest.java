package com.cantte.cetus.api.debitnotes;

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
import org.junit.jupiter.api.Timeout;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class DebitNoteResourceTest {

    @Test
    void aDebitNoteChargesItsLinesOnTopOfTheInvoice() {
        Issuer issuer = issuer("Interest SAS");
        JsonPath invoice = acceptedInvoice(issuer);

        JsonPath note = create(issuer.apiKey(), interest(invoice.getString("id"), 10000))
                .then().statusCode(202).extract().jsonPath();

        assertThat(note.getString("number")).startsWith("ND");
        assertThat(note.getString("status")).isEqualTo("RECEIVED");
        assertThat(note.getString("concept")).isEqualTo("INTEREST");
        assertThat(note.getString("invoice.id")).isEqualTo(invoice.getString("id"));
        assertThat(note.getString("invoice.number")).isEqualTo(invoice.getString("number"));
        assertThat(note.getString("invoice.cufe")).isEqualTo(cufe(invoice.getString("id")));
        assertThat(note.getDouble("totals.payable")).isEqualTo(11900.0);

        JsonPath fetched = api(issuer.apiKey()).get("/v1/debit-notes/" + note.getString("id"))
                .then().statusCode(200).extract().jsonPath();
        assertThat(fetched.getString("description")).isEqualTo("Intereses de mora de octubre");
        api(issuer.apiKey()).get("/v1/debit-notes/" + note.getString("id") + "/files/xml")
                .then().statusCode(404).body("code", equalTo("file_not_available"));

        JsonPath refreshed = api(issuer.apiKey()).get("/v1/invoices/" + invoice.getString("id"))
                .then().statusCode(200).extract().jsonPath();
        assertThat(refreshed.getList("debitNotes.id")).containsExactly(note.getString("id"));
        assertThat(refreshed.getString("debitNotes[0].concept")).isEqualTo("INTEREST");
        assertThat(refreshed.getList("creditNotes")).isEmpty();
        // Until the DIAN accepts it, the debit note does not raise what credit notes can take.
        assertThat(refreshed.getDouble("balance")).isEqualTo(119000.0);
    }

    @Test
    void anAcceptedDebitNoteRaisesTheCreditableBalance() {
        Issuer issuer = issuer("Debit then credit SAS");
        String invoiceId = acceptedInvoice(issuer).getString("id");
        String debitId = create(issuer.apiKey(), interest(invoiceId, 10000)).then().statusCode(202).extract().path("id");

        // Cancelling the invoice takes its whole balance; nothing is left for the debit note's amount yet.
        Map<String, Object> creditFor10000 = credit(invoiceId, 10000);
        api(issuer.apiKey()).header("Idempotency-Key", UUID.randomUUID().toString())
                .body(Map.of("invoiceId", invoiceId, "concept", "CANCELLATION", "description", "Anulación"))
                .post("/v1/credit-notes").then().statusCode(202);
        api(issuer.apiKey()).header("Idempotency-Key", UUID.randomUUID().toString()).body(creditFor10000)
                .post("/v1/credit-notes").then().statusCode(422).body("code", equalTo("credit_note_exceeds_balance"));

        setStatus(debitId, DocumentStatus.ACCEPTED);

        api(issuer.apiKey()).header("Idempotency-Key", UUID.randomUUID().toString()).body(creditFor10000)
                .post("/v1/credit-notes").then().statusCode(202);
        JsonPath refreshed = api(issuer.apiKey()).get("/v1/invoices/" + invoiceId)
                .then().statusCode(200).extract().jsonPath();
        assertThat(refreshed.getList("creditNotes")).hasSize(2);
        assertThat(refreshed.getDouble("balance")).isZero();
    }

    @Test
    void linesAreRequired() {
        Issuer issuer = issuer("No lines SAS");
        String invoiceId = acceptedInvoice(issuer).getString("id");
        Map<String, Object> request = interest(invoiceId, 10000);
        request.remove("lines");

        create(issuer.apiKey(), request).then().statusCode(400);
    }

    @Test
    void onlyAcceptedInvoicesCanBeDebited() {
        Issuer issuer = issuer("Pending debit SAS");
        String invoiceId = invoice(issuer).getString("id");

        create(issuer.apiKey(), interest(invoiceId, 10000))
                .then().statusCode(422).body("code", equalTo("invoice_not_accepted"));
    }

    @Test
    void anInvoiceOfAnotherAccountIsNotFound() {
        Issuer owner = issuer("Debit owner SAS");
        String invoiceId = acceptedInvoice(owner).getString("id");
        Issuer other = issuer("Debit other SAS");

        create(other.apiKey(), interest(invoiceId, 10000)).then().statusCode(404);
    }

    @Test
    void aNoteCannotBeDebitedAsIfItWereAnInvoice() {
        Issuer issuer = issuer("Debit on note SAS");
        String invoiceId = acceptedInvoice(issuer).getString("id");
        String noteId = create(issuer.apiKey(), interest(invoiceId, 1000)).then().statusCode(202).extract().path("id");
        setStatus(noteId, DocumentStatus.ACCEPTED);

        create(issuer.apiKey(), interest(noteId, 1000)).then().statusCode(404);
        api(issuer.apiKey()).get("/v1/credit-notes/" + noteId).then().statusCode(404);
        api(issuer.apiKey()).get("/v1/debit-notes/" + invoiceId).then().statusCode(404);
    }

    @Test
    void withoutADebitNoteRangeTheNoteIsRefused() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "No debit range SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        Issuer issuer = new Issuer(issuerId, testKey(user));
        String invoiceId = acceptedInvoice(issuer).getString("id");

        create(issuer.apiKey(), interest(invoiceId, 10000))
                .then().statusCode(422).body("code", equalTo("no_active_numbering_range"));
    }

    @Test
    void aRetryWithTheSameKeyReturnsTheSameNote() {
        Issuer issuer = issuer("Debit retry SAS");
        String invoiceId = acceptedInvoice(issuer).getString("id");
        String key = UUID.randomUUID().toString();

        String first = api(issuer.apiKey()).header("Idempotency-Key", key).body(interest(invoiceId, 10000))
                .post("/v1/debit-notes").then().statusCode(202).extract().path("id");
        String replayed = api(issuer.apiKey()).header("Idempotency-Key", key).body(interest(invoiceId, 10000))
                .post("/v1/debit-notes")
                .then().statusCode(202).header("Idempotent-Replayed", "true").extract().path("id");

        assertThat(replayed).isEqualTo(first);
    }

    @Test
    @Timeout(30)
    void hugeExponentsInTheLinesAreRefusedBeforeAnyArithmetic() {
        Issuer issuer = issuer("Debit exponent SAS");
        String invoiceId = acceptedInvoice(issuer).getString("id");
        // The lines are the invoice's: a dozen characters of JSON must not reach BigDecimal.setScale.
        for (String line : List.of(
                "\"quantity\": 1e999999999, \"unitPrice\": 1",
                "\"quantity\": 1, \"unitPrice\": 1e999999999",
                "\"quantity\": 1, \"unitPrice\": 1, \"taxes\": [{\"type\": \"IVA\", \"percent\": 1e-999999999}]")) {
            String body = """
                    {"invoiceId": "%s", "concept": "INTEREST", "description": "Ajuste",
                     "lines": [{"itemCode": "SERV-1", "description": "Servicio", %s}]}
                    """.formatted(invoiceId, line);
            api(issuer.apiKey()).header("Idempotency-Key", UUID.randomUUID().toString()).body(body)
                    .post("/v1/debit-notes")
                    .then().statusCode(400)
                    .body("code", equalTo("invalid_request"));
        }
    }

    @Test
    void theDescriptionAndNotesAreBounded() {
        Issuer issuer = issuer("Debit bounds SAS");
        String invoiceId = acceptedInvoice(issuer).getString("id");

        // The description goes verbatim into a cbc:Note and the PDF.
        for (String description : List.of("Ajuste\u0001", "Ajuste\u0000", "Ajuste \u202Efdp.exe")) {
            Map<String, Object> request = interest(invoiceId, 10000);
            request.put("description", description);
            create(issuer.apiKey(), request).then().statusCode(400);
        }

        Map<String, Object> manyNotes = interest(invoiceId, 10000);
        manyNotes.put("notes", Collections.nCopies(21, "Nota"));
        create(issuer.apiKey(), manyNotes).then().statusCode(400);

        api(issuer.apiKey()).header("Idempotency-Key", "k".repeat(101)).body(interest(invoiceId, 10000))
                .post("/v1/debit-notes")
                .then().statusCode(400);
    }

    private record Issuer(String id, String apiKey) {
    }

    private static Issuer issuer(String name) {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, name);
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        ConsoleFixtures.addDebitNoteRange(user, issuerId);
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

    private static Map<String, Object> interest(String invoiceId, int unitPrice) {
        return new HashMap<>(Map.of(
                "invoiceId", invoiceId,
                "concept", "INTEREST",
                "description", "Intereses de mora de octubre",
                "lines", List.of(line(unitPrice))));
    }

    private static Map<String, Object> credit(String invoiceId, int unitPrice) {
        return Map.of(
                "invoiceId", invoiceId,
                "concept", "PRICE_ADJUSTMENT",
                "description", "Ajuste",
                "lines", List.of(line(unitPrice)));
    }

    private static Map<String, Object> line(int unitPrice) {
        return Map.of("itemCode", "SERV-1", "description", "Servicio", "quantity", 1, "unitPrice", unitPrice,
                "taxes", List.of(Map.of("type", "IVA", "percent", 19)));
    }

    private static io.restassured.response.Response create(String apiKey, Map<String, Object> request) {
        return api(apiKey).header("Idempotency-Key", UUID.randomUUID().toString()).body(request)
                .post("/v1/debit-notes");
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
