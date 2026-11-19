package com.cantte.cetus.api.batches;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.onboard;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.Credits;
import com.cantte.cetus.api.support.IssuedDocuments;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.persistence.entity.DocumentBatchItemEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import io.restassured.response.Response;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ConsoleBatchResourceTest {

    @Test
    void aBatchWithErrorsAnswersAllOfThemAndStoresNothing() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Lote Errores SAS");
        String issuerId = onboard(user).issuerId();
        Map<String, Object> badCheckDigit = item("A-1", newCustomer("900999999", "9"), List.of(line(1, 1000)));
        Map<String, Object> noQuantity = item("A-2", newCustomer("900999999", null), List.of(line(null, 1000)));
        Map<String, Object> duplicated = item("A-1", newCustomer("900999999", null), List.of(line(1, 1000)));
        Map<String, Object> valid = item("A-4", newCustomer("900999999", null), List.of(line(1, 1000)));

        JsonPath problem = send(
                        user,
                        UUID.randomUUID().toString(),
                        batch(issuerId, badCheckDigit, noQuantity, duplicated, valid))
                .then()
                .statusCode(422)
                .body("code", equalTo("invalid_batch"))
                .extract()
                .jsonPath();

        assertThat(problem.getList("errors.index", Integer.class)).containsExactly(0, 1, 2);
        assertThat(problem.getString("errors[0].code")).isEqualTo("customer_check_digit_invalid");
        assertThat(problem.getString("errors[1].field")).isEqualTo("lines[0].quantity");
        assertThat(problem.getString("errors[2].code")).isEqualTo("reference_duplicated");
        assertThat(list(user, "TEST").getList("items")).isEmpty();
    }

    @Test
    void anItemTakesWhatItLeavesOutFromTheCatalogs() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Lote Catalogo SAS");
        String issuerId = onboard(user).issuerId();
        user.request()
                .body(Map.of(
                        "personType", "LEGAL_ENTITY",
                        "identificationType", "NIT",
                        "identificationNumber", "900888777",
                        "legalName", "Cliente del Catálogo SAS",
                        "taxScheme", "IVA",
                        "email", "catalogo@cliente.example"))
                .post("/console/customers?environment=TEST")
                .then()
                .statusCode(201);
        user.request()
                .body(Map.of(
                        "code",
                        "ARR-1",
                        "description",
                        "Arriendo mensual",
                        "unitPrice",
                        1500000,
                        "taxes",
                        List.of(Map.of("type", "IVA", "percent", 19))))
                .post("/console/products?environment=TEST")
                .then()
                .statusCode(201);

        Map<String, Object> customer = Map.of(
                "identificationType", "NIT",
                "identificationNumber", "900888777",
                "email", "otro@cliente.example");
        Map<String, Object> catalogLine = Map.of("productCode", "ARR-1", "quantity", 1);
        Map<String, Object> overriddenLine = Map.of("productCode", "ARR-1", "quantity", 2, "unitPrice", 1000000);
        String id = send(
                        user,
                        UUID.randomUUID().toString(),
                        batch(issuerId, item("ARR-NOV", customer, List.of(catalogLine, overriddenLine))))
                .then()
                .statusCode(202)
                .body("status", equalTo("RECEIVED"))
                .body("items", equalTo(1))
                .extract()
                .path("id");

        DocumentBatchItemEntity.Payload payload = QuarkusTransaction.requiringNew()
                .call(() ->
                        DocumentBatchItemEntity.listByBatch(UUID.fromString(id)).getFirst().payload);
        Party party = payload.customer();
        assertThat(party.legalName()).isEqualTo("Cliente del Catálogo SAS");
        assertThat(party.email()).isEqualTo("otro@cliente.example");
        assertThat(party.checkDigit()).isEqualTo("1");
        assertThat(payload.lines().get(0).description()).isEqualTo("Arriendo mensual");
        assertThat(payload.lines().get(0).unitPrice()).isEqualByComparingTo(new BigDecimal("1500000"));
        assertThat(payload.lines().get(0).taxes()).hasSize(1);
        assertThat(payload.lines().get(1).unitPrice()).isEqualByComparingTo(new BigDecimal("1000000"));
        assertThat(payload.lines().get(1).itemCode()).isEqualTo("ARR-1");

        JsonPath view = user.request()
                .get("/console/document-batches/" + id)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertThat(view.getString("status")).isEqualTo("RECEIVED");
        assertThat(view.getInt("counts.notCreated")).isEqualTo(1);
    }

    @Test
    void aCustomerOutOfTheCatalogNeedsEveryField() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Lote Sin Catalogo SAS");
        String issuerId = onboard(user).issuerId();
        Map<String, Object> customer = Map.of("identificationType", "NIT", "identificationNumber", "900777666");

        JsonPath problem = send(
                        user,
                        UUID.randomUUID().toString(),
                        batch(issuerId, item("B-1", customer, List.of(Map.of("productCode", "NOPE", "quantity", 1)))))
                .then()
                .statusCode(422)
                .extract()
                .jsonPath();

        assertThat(problem.getList("errors.field", String.class))
                .contains("customer.legalName", "customer.personType", "lines[0].description", "lines[0].unitPrice");
    }

    @Test
    void theSameKeyGetsTheSameBatch() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Lote Idempotente SAS");
        String issuerId = onboard(user).issuerId();
        String key = UUID.randomUUID().toString();
        Map<String, Object> request =
                batch(issuerId, item("C-1", newCustomer("900999999", null), List.of(line(1, 5000))));

        String first = send(user, key, request).then().statusCode(202).extract().path("id");
        send(user, key, request)
                .then()
                .statusCode(202)
                .header("Idempotent-Replayed", "true")
                .body("id", equalTo(first));
        assertThat(list(user, "TEST").getList("items.id")).containsExactly(first);
    }

    @Test
    void anAccountHasAtMostFiveOpenBatches() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Lote Abiertos SAS");
        String issuerId = onboard(user).issuerId();
        for (int i = 0; i < BatchIntake.OPEN_MAX; i++) {
            send(
                            user,
                            UUID.randomUUID().toString(),
                            batch(issuerId, item("D-" + i, newCustomer("900999999", null), List.of(line(1, 100)))))
                    .then()
                    .statusCode(202);
        }
        send(
                        user,
                        UUID.randomUUID().toString(),
                        batch(issuerId, item("D-X", newCustomer("900999999", null), List.of(line(1, 100)))))
                .then()
                .statusCode(409)
                .body("code", equalTo("too_many_open_batches"));
    }

    @Test
    void aSandboxBatchFitsInTheDailyQuotaWithTheOpenBatches() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Lote Simulacion SAS");
        String issuerId = sandboxIssuer(user);
        send(
                        user,
                        UUID.randomUUID().toString(),
                        batch(
                                issuerId,
                                item("E-1", newCustomer("900999999", null), List.of(line(1, 100))),
                                item("E-2", newCustomer("900999999", null), List.of(line(1, 100)))))
                .then()
                .statusCode(202);

        // The quota of the test profile is 3, and the open batch already holds 2 of them.
        send(
                        user,
                        UUID.randomUUID().toString(),
                        batch(
                                issuerId,
                                item("E-3", newCustomer("900999999", null), List.of(line(1, 100))),
                                item("E-4", newCustomer("900999999", null), List.of(line(1, 100)))))
                .then()
                .statusCode(429)
                .body("code", equalTo("sandbox_daily_limit"));
    }

    @Test
    void aLiveBatchNeedsCreditsForEveryInvoice() {
        ConsoleUser user = ConsoleUser.newOrganization();
        IssuedDocuments.Issuer issuer = IssuedDocuments.liveIssuer(user, "Lote Produccion SAS");
        UUID accountId = UUID.fromString(user.request().get("/console/account").path("id"));
        Credits.expireAll(accountId);

        send(
                        user,
                        UUID.randomUUID().toString(),
                        batch(issuer.id(), item("F-1", newCustomer("900999999", null), List.of(line(1, 100)))))
                .then()
                .statusCode(402)
                .body("code", equalTo("insufficient_credits"));
    }

    @Test
    void anotherAccountNeverSeesTheBatch() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Lote Propio SAS");
        String issuerId = onboard(user).issuerId();
        String id = send(
                        user,
                        UUID.randomUUID().toString(),
                        batch(issuerId, item("G-1", newCustomer("900999999", null), List.of(line(1, 100)))))
                .then()
                .statusCode(202)
                .extract()
                .path("id");

        ConsoleUser other = ConsoleUser.newOrganization();
        bootstrap(other, "Lote Ajeno SAS");
        other.request().get("/console/document-batches/" + id).then().statusCode(404);
        other.request()
                .get("/console/document-batches/" + id + "/documents")
                .then()
                .statusCode(404);
        other.request()
                .get("/console/document-batches/" + id + "/result.csv")
                .then()
                .statusCode(404);
        send(
                        other,
                        UUID.randomUUID().toString(),
                        batch(issuerId, item("G-2", newCustomer("900999999", null), List.of(line(1, 100)))))
                .then()
                .statusCode(404);
        assertThat(list(other, "TEST").getList("items")).isEmpty();
    }

    @Test
    void theResultListsEveryItemAndWarnsAboutTheSameFile() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Lote Resultado SAS");
        String issuerId = onboard(user).issuerId();
        String sha = "a".repeat(64);
        Map<String, Object> request = batch(
                issuerId,
                item("=HYPERLINK(1)", newCustomer("900999999", null), List.of(line(1, 100))),
                item("H-2", newCustomer("900999999", null), List.of(line(1, 100))));
        request.put("fileName", "noviembre.xlsx");
        request.put("fileSha256", sha);
        String id = send(user, UUID.randomUUID().toString(), request)
                .then()
                .statusCode(202)
                .extract()
                .path("id");

        byte[] csv = user.request()
                .get("/console/document-batches/" + id + "/result.csv")
                .then()
                .statusCode(200)
                .extract()
                .asByteArray();
        String text = new String(csv, StandardCharsets.UTF_8);
        assertThat(text).startsWith("﻿Referencia;Posición;Número;CUFE;Estado;Motivo;Creada\r\n");
        assertThat(text).contains("'=HYPERLINK(1);1;;;No creada;;No\r\n", "H-2;2;;;No creada;;No\r\n");

        user.request()
                .queryParam("issuerId", issuerId)
                .queryParam("fileSha256", sha)
                .get("/console/document-batches/same-file")
                .then()
                .statusCode(200)
                .body("batch.id", equalTo(id));
        user.request()
                .queryParam("issuerId", issuerId)
                .queryParam("fileSha256", "b".repeat(64))
                .get("/console/document-batches/same-file")
                .then()
                .statusCode(200)
                .body("batch", equalTo(null));
    }

    static Response send(ConsoleUser user, String key, Map<String, Object> request) {
        return user.request().header("Idempotency-Key", key).body(request).post("/console/document-batches");
    }

    private static JsonPath list(ConsoleUser user, String environment) {
        return user.request()
                .get("/console/document-batches?environment=" + environment)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
    }

    @SafeVarargs
    static Map<String, Object> batch(String issuerId, Map<String, Object>... items) {
        Map<String, Object> request = new HashMap<>();
        request.put("issuerId", issuerId);
        request.put("items", List.of(items));
        return request;
    }

    static Map<String, Object> item(String reference, Map<String, Object> customer, List<Map<String, Object>> lines) {
        return Map.of(
                "reference", reference,
                "customer", customer,
                "payment", Map.of("method", "CASH", "meansCode", "10"),
                "lines", lines);
    }

    static Map<String, Object> newCustomer(String nit, String checkDigit) {
        Map<String, Object> customer = new HashMap<>(Map.of(
                "personType", "LEGAL_ENTITY",
                "identificationType", "NIT",
                "identificationNumber", nit,
                "legalName", "Cliente Nuevo SAS",
                "taxScheme", "IVA"));
        if (checkDigit != null) {
            customer.put("checkDigit", checkDigit);
        }
        return customer;
    }

    static Map<String, Object> line(Integer quantity, int unitPrice) {
        Map<String, Object> line = new HashMap<>(Map.of(
                "description",
                "Servicio",
                "unitPrice",
                unitPrice,
                "taxes",
                List.of(Map.of("type", "IVA", "percent", 19))));
        if (quantity != null) {
            line.put("quantity", quantity);
        }
        return line;
    }

    private static String sandboxIssuer(ConsoleUser user) {
        List<Map<String, Object>> issuers = new ArrayList<>(user.request()
                .get("/console/issuers")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getList("$"));
        return issuers.stream()
                .filter(issuer -> "SANDBOX".equals(issuer.get("environment")))
                .map(issuer -> (String) issuer.get("id"))
                .findFirst()
                .orElseThrow();
    }
}
