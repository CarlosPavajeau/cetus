package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.addCreditNoteRange;
import static com.cantte.cetus.api.support.ConsoleFixtures.addDebitNoteRange;
import static com.cantte.cetus.api.support.ConsoleFixtures.addRange;
import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.IssuedDocuments;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import io.restassured.response.Response;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ConsoleIssuanceTest {

    @Test
    void thePreviewHasTheTotalsOfTheIssuedInvoice() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Vista Previa SAS");
        List<Map<String, Object>> lines = List.of(
                line("Asesoría", 2, 150000, List.of(tax("IVA", 19))),
                line("Libro", 1, 80000, List.of(tax("IVA", 5))),
                line("Arriendo", 1, 50000, List.of()),
                line("Almuerzo", 3, 20000, List.of(tax("INC", 8))));

        JsonPath preview = user.request()
                .body(Map.of("lines", lines))
                .post("/console/documents/preview")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertThat(preview.getDouble("totals.lineExtension")).isEqualTo(490000.0);
        assertThat(preview.getDouble("totals.taxExclusive")).isEqualTo(490000.0 - 50000.0);
        assertThat(preview.getDouble("totals.payable")).isEqualTo(490000.0 + 57000.0 + 4000.0 + 4800.0);
        assertThat(preview.getList("lines.taxAmount", Double.class)).containsExactly(57000.0, 4000.0, 0.0, 4800.0);
        assertThat(preview.getList("taxes.type")).containsExactly("IVA", "IVA", "INC");

        String issuerId = sampleIssuer(user);
        String id = issue(user, UUID.randomUUID().toString(), invoice(issuerId, lines))
                .then()
                .statusCode(202)
                .extract()
                .path("id");
        JsonPath detail = detail(user, id);
        assertThat(detail.getDouble("totals.payable")).isEqualTo(preview.getDouble("totals.payable"));
        assertThat(detail.getDouble("totals.taxExclusive")).isEqualTo(preview.getDouble("totals.taxExclusive"));
        assertThat(detail.getList("taxes.amount")).isEqualTo(preview.getList("taxes.amount"));
    }

    @Test
    void thePreviewValidatesTheLines() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Vista Invalida SAS");

        user.request()
                .body(Map.of("lines", List.of()))
                .post("/console/documents/preview")
                .then()
                .statusCode(400);
        user.request()
                .body(Map.of("lines", List.of(line("Servicio", -1, 1000, List.of()))))
                .post("/console/documents/preview")
                .then()
                .statusCode(400);
    }

    @Test
    void aMemberIssuesASandboxInvoiceOnceForTheSameKey() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Primera Factura SAS");
        ConsoleUser member = owner.member("member");
        String issuerId = sampleIssuer(owner);
        String key = UUID.randomUUID().toString();
        Map<String, Object> request = invoice(issuerId, List.of(line("Servicio", 1, 100000, List.of(tax("IVA", 19)))));

        JsonPath created =
                issue(member, key, request).then().statusCode(202).extract().jsonPath();
        assertThat(created.getString("number")).startsWith("SIM");
        issue(member, key, request)
                .then()
                .statusCode(202)
                .header("Idempotent-Replayed", "true")
                .body("id", equalTo(created.getString("id")));

        JsonPath detail = detail(member, created.getString("id"));
        assertThat(detail.getString("environment")).isEqualTo("SANDBOX");
        assertThat(detail.getString("customer.legalName")).isEqualTo("Cliente de Ejemplo SAS");
        assertThat(detail.getString("customer.checkDigit")).isEqualTo("4");

        List<Map<String, Object>> audited = AuditTrailTest.entries(owner, "INVOICE_ISSUED");
        assertThat(audited)
                .singleElement()
                .satisfies(entry -> assertThat(entry)
                        .containsEntry("resourceId", created.getString("id"))
                        .containsEntry("actorId", member.userId()));
    }

    @Test
    void theIssuerMustBeGivenAndBelongToTheAccount() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Sin Emisor SAS");
        Map<String, Object> request =
                invoice(sampleIssuer(user), List.of(line("Servicio", 1, 1000, List.of(tax("IVA", 19)))));
        request.remove("issuerId");
        issue(user, UUID.randomUUID().toString(), request)
                .then()
                .statusCode(422)
                .body("code", equalTo("issuer_required"));

        ConsoleUser other = ConsoleUser.newOrganization();
        bootstrap(other, "Ajeno SAS");
        Map<String, Object> foreign =
                invoice(sampleIssuer(other), List.of(line("Servicio", 1, 1000, List.of(tax("IVA", 19)))));
        issue(user, UUID.randomUUID().toString(), foreign).then().statusCode(404);
    }

    @Test
    void onlyOwnersAndAdminsIssueLiveDocumentsAndNeverWhileImpersonated() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Produccion SAS");
        String liveIssuerId = liveIssuer(owner);
        Map<String, Object> request =
                invoice(liveIssuerId, List.of(line("Servicio", 1, 100000, List.of(tax("IVA", 19)))));

        issue(owner.member("member"), UUID.randomUUID().toString(), request)
                .then()
                .statusCode(403)
                .body("code", equalTo("organization_role_forbidden"));
        owner.impersonatedBy("user_" + UUID.randomUUID())
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(request)
                .post("/console/documents/invoices")
                .then()
                .statusCode(403)
                .body("code", equalTo("impersonation_forbidden"));

        String id = issue(owner.member("admin"), UUID.randomUUID().toString(), request)
                .then()
                .statusCode(202)
                .extract()
                .path("id");
        assertThat(detail(owner, id).getString("environment")).isEqualTo("LIVE");

        // Impersonating stays possible outside LIVE, for support and demos.
        owner.impersonatedBy("user_" + UUID.randomUUID())
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoice(sampleIssuer(owner), List.of(line("Servicio", 1, 1000, List.of()))))
                .post("/console/documents/invoices")
                .then()
                .statusCode(202);
    }

    @Test
    void notesAreIssuedAgainstAnAcceptedInvoice() {
        ConsoleUser user = ConsoleUser.newOrganization();
        IssuedDocuments.Issuer issuer = IssuedDocuments.issuer(user, "Notas SAS");
        addCreditNoteRange(user, issuer.id());
        addDebitNoteRange(user, issuer.id());
        UUID invoiceId = IssuedDocuments.invoice(issuer);

        Map<String, Object> credit = Map.of(
                "concept", "PRICE_ADJUSTMENT",
                "description", "Descuento acordado",
                "lines", List.of(line("Descuento", 1, 10000, List.of(tax("IVA", 19)))));
        note(user, invoiceId, "credit-notes", credit)
                .then()
                .statusCode(422)
                .body("code", equalTo("invoice_not_accepted"));
        IssuedDocuments.accept(invoiceId);

        JsonPath creditNote = note(user, invoiceId, "credit-notes", credit)
                .then()
                .statusCode(202)
                .extract()
                .jsonPath();
        assertThat(creditNote.getString("number")).startsWith("NC");
        Map<String, Object> debit = Map.of(
                "concept", "INTEREST",
                "description", "Intereses de mora",
                "lines", List.of(line("Intereses", 1, 5000, List.of())));
        JsonPath debitNote = note(user, invoiceId, "debit-notes", debit)
                .then()
                .statusCode(202)
                .extract()
                .jsonPath();

        JsonPath invoice = detail(user, invoiceId.toString());
        assertThat(invoice.getList("creditNotes.id")).containsExactly(creditNote.getString("id"));
        assertThat(invoice.getList("debitNotes.id")).containsExactly(debitNote.getString("id"));
        assertThat(detail(user, creditNote.getString("id")).getString("description"))
                .isEqualTo("Descuento acordado");
        assertThat(AuditTrailTest.entries(user, "CREDIT_NOTE_ISSUED")).hasSize(1);
        assertThat(AuditTrailTest.entries(user, "DEBIT_NOTE_ISSUED"))
                .singleElement()
                .satisfies(entry -> assertThat(entry).containsEntry("resourceId", debitNote.getString("id")));

        note(user, invoiceId, "credit-notes", Map.of("concept", "PRICE_ADJUSTMENT", "description", "Sin líneas"))
                .then()
                .statusCode(400);
    }

    private static String sampleIssuer(ConsoleUser user) {
        return user
                .request()
                .get("/console/issuers")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .<Map<String, Object>>getList("$")
                .stream()
                .filter(issuer -> "SANDBOX".equals(issuer.get("environment")))
                .map(issuer -> (String) issuer.get("id"))
                .findFirst()
                .orElseThrow();
    }

    private static String liveIssuer(ConsoleUser user) {
        String testId = onboard(user).issuerId();
        String liveId = user.request()
                .post("/console/issuers/" + testId + "/promote")
                .then()
                .statusCode(200)
                .extract()
                .path("id");
        addRange(user, liveId, "FE");
        return liveId;
    }

    private static Response issue(ConsoleUser user, String key, Map<String, Object> request) {
        return user.request().header("Idempotency-Key", key).body(request).post("/console/documents/invoices");
    }

    private static Response note(ConsoleUser user, UUID invoiceId, String kind, Map<String, Object> request) {
        return user.request()
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(request)
                .post("/console/documents/" + invoiceId + "/" + kind);
    }

    private static JsonPath detail(ConsoleUser user, String id) {
        return user.request()
                .get("/console/documents/" + id)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
    }

    private static Map<String, Object> invoice(String issuerId, List<Map<String, Object>> lines) {
        Map<String, Object> request = new java.util.HashMap<>();
        request.put("issuerId", issuerId);
        request.put(
                "customer",
                Map.of(
                        "personType", "LEGAL_ENTITY",
                        "identificationType", "NIT",
                        "identificationNumber", "900999999",
                        "legalName", "Cliente de Ejemplo SAS",
                        "taxScheme", "IVA"));
        request.put("payment", Map.of("method", "CASH", "meansCode", "10"));
        request.put("lines", lines);
        return request;
    }

    private static Map<String, Object> line(String description, int quantity, int unitPrice, List<?> taxes) {
        return Map.of(
                "itemCode", description.toUpperCase(),
                "description", description,
                "quantity", quantity,
                "unitPrice", unitPrice,
                "taxes", taxes);
    }

    private static Map<String, Object> tax(String type, int percent) {
        return Map.of("type", type, "percent", percent);
    }
}
