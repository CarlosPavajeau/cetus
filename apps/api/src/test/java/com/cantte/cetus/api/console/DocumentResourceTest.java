package com.cantte.cetus.api.console;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.IssuedDocuments;
import com.cantte.cetus.api.support.IssuedDocuments.Issuer;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.persistence.entity.DianSubmissionEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.cantte.cetus.api.support.IssuedDocuments.api;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class DocumentResourceTest {

    @Test
    void listsTheAccountsDocumentsNewestFirstWithACursor() {
        ConsoleUser user = ConsoleUser.newOrganization();
        Issuer issuer = IssuedDocuments.issuer(user, "Listado SAS");
        UUID first = IssuedDocuments.invoice(issuer);
        UUID second = IssuedDocuments.invoice(issuer);
        UUID third = IssuedDocuments.invoice(issuer);
        // Another account's invoice never shows up.
        IssuedDocuments.invoice(IssuedDocuments.issuer("Otra SAS"));

        JsonPath page = list(user, "?limit=2");
        assertThat(page.getList("items.id")).containsExactly(third.toString(), second.toString());
        assertThat(page.getString("items[0].issuerName")).isNotBlank();
        assertThat(page.getString("items[0].customerName")).isEqualTo("Consumidor Final");
        assertThat(page.getString("items[0].documentType")).isEqualTo("INVOICE");

        JsonPath rest = list(user, "?limit=2&before=" + page.getString("nextCursor"));
        assertThat(rest.getList("items.id")).containsExactly(first.toString());
        assertThat(rest.getString("nextCursor")).isNull();
    }

    @Test
    void filtersByEnvironmentTypeStatusDateAndText() {
        ConsoleUser user = ConsoleUser.newOrganization();
        Issuer issuer = IssuedDocuments.issuer(user, "Filtros SAS");
        UUID accepted = IssuedDocuments.invoice(issuer);
        UUID received = IssuedDocuments.invoice(issuer);
        IssuedDocuments.accept(accepted);
        String number = QuarkusTransaction.requiringNew().call(() ->
                DocumentEntity.<DocumentEntity>findById(received).fullNumber());

        assertThat(list(user, "?status=ACCEPTED").getList("items.id")).containsExactly(accepted.toString());
        assertThat(list(user, "?type=CREDIT_NOTE").getList("items")).isEmpty();
        assertThat(list(user, "?environment=LIVE").getList("items")).isEmpty();
        assertThat(list(user, "?environment=TEST&issuerId=" + issuer.id()).getList("items")).hasSize(2);
        assertThat(list(user, "?q=" + number).getList("items.id")).containsExactly(received.toString());
        assertThat(list(user, "?q=consumidor").getList("items")).hasSize(2);
        assertThat(list(user, "?q=1020304050").getList("items")).hasSize(2);
        assertThat(list(user, "?q=100%25").getList("items")).isEmpty();
        assertThat(list(user, "?from=2000-01-01&to=2000-12-31").getList("items")).isEmpty();
        assertThat(list(user, "?from=2000-01-01").getList("items")).hasSize(2);
    }

    @Test
    void theDetailShowsTotalsDianAnswerNotesAndTimeline() {
        ConsoleUser user = ConsoleUser.newOrganization();
        Issuer issuer = IssuedDocuments.issuer(user, "Detalle SAS");
        ConsoleFixtures.addCreditNoteRange(user, issuer.id());
        UUID invoiceId = IssuedDocuments.invoice(issuer);
        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity doc = DocumentEntity.findById(invoiceId);
            doc.status = DocumentStatus.ACCEPTED;
            doc.cufe = "cufe-" + invoiceId;
            doc.dianStatusCode = "00";
            doc.dianStatusMessage = "Procesado Correctamente.";
            doc.dianErrors = List.of("Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT");
            doc.validatedAt = OffsetDateTime.now();
            DianSubmissionEntity submission = new DianSubmissionEntity();
            submission.id = Ids.newId();
            submission.documentId = invoiceId;
            submission.operation = "SendBillSync";
            submission.valid = true;
            submission.statusCode = "00";
            submission.durationMs = 850;
            submission.persist();
        });
        String noteId = api(issuer.apiKey()).header("Idempotency-Key", UUID.randomUUID().toString())
                .body(Map.of("invoiceId", invoiceId.toString(), "concept", "CANCELLATION", "description", "Error"))
                .post("/v1/credit-notes").then().statusCode(202).extract().path("id");

        JsonPath invoice = user.request().get("/console/documents/" + invoiceId)
                .then().statusCode(200).extract().jsonPath();
        assertThat(invoice.getString("cufe")).isEqualTo("cufe-" + invoiceId);
        assertThat(invoice.getString("issuer.id")).isEqualTo(issuer.id());
        assertThat(invoice.getString("customer.legalName")).isEqualTo("Consumidor Final");
        assertThat(invoice.getList("lines")).hasSize(1);
        assertThat(invoice.getString("taxes[0].type")).isEqualTo("IVA");
        assertThat(invoice.getDouble("totals.payable")).isEqualTo(119000.0);
        assertThat(invoice.getList("dian.errors")).hasSize(1);
        assertThat(invoice.getList("creditNotes.id")).containsExactly(noteId);
        assertThat(invoice.getString("creditNotes[0].concept")).isEqualTo("CANCELLATION");
        assertThat(invoice.getDouble("balance")).isZero();
        assertThat(invoice.getString("invoice")).isNull();
        assertThat(invoice.getList("events.kind")).containsExactly("CREATED", "DIAN_SUBMISSION", "VALIDATED");
        assertThat(invoice.getString("events[1].status")).isEqualTo("VALID");
        assertThat(invoice.getString("events[1].operation")).isEqualTo("SendBillSync");

        JsonPath note = user.request().get("/console/documents/" + noteId)
                .then().statusCode(200).extract().jsonPath();
        assertThat(note.getString("documentType")).isEqualTo("CREDIT_NOTE");
        assertThat(note.getString("invoice.id")).isEqualTo(invoiceId.toString());
        assertThat(note.getString("concept")).isEqualTo("CANCELLATION");
        assertThat(note.getString("description")).isEqualTo("Error");
        assertThat(note.getList("creditNotes")).isEmpty();
        assertThat(note.getString("balance")).isNull();
    }

    @Test
    void anotherAccountsDocumentIsNotFound() {
        UUID foreign = IssuedDocuments.invoice(IssuedDocuments.issuer("Ajena SAS"));
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Curiosa SAS");

        user.request().get("/console/documents/" + foreign).then().statusCode(404);
        user.request().get("/console/documents/" + foreign + "/files/pdf").then().statusCode(404);
    }

    @Test
    void filesArePresignedOnceTheyExist() {
        ConsoleUser user = ConsoleUser.newOrganization();
        Issuer issuer = IssuedDocuments.issuer(user, "Archivos SAS");
        UUID invoiceId = IssuedDocuments.invoice(issuer);

        user.request().get("/console/documents/" + invoiceId + "/files/pdf")
                .then().statusCode(404).body("code", equalTo("file_not_available"));

        String key = IssuedDocuments.artifact(invoiceId, DocumentArtifactEntity.Kind.PDF, "fv.pdf");
        String url = user.request().get("/console/documents/" + invoiceId + "/files/pdf")
                .then().statusCode(200).extract().path("url");
        assertThat(url).contains(key);
    }

    private static JsonPath list(ConsoleUser user, String query) {
        return user.request().get("/console/documents" + query).then().statusCode(200).extract().jsonPath();
    }
}
