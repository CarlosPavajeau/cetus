package com.cantte.cetus.api.catalog;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.IssuedDocuments.api;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CatalogResourceTest {

    @Test
    void customersAreKeptPerEnvironmentWithTheirCheckDigit() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Clientes SAS");
        String sandboxKey = key(user, "SANDBOX");
        String testKey = key(user, "TEST");

        JsonPath created = api(sandboxKey)
                .body(customer("900123456", "Comprador SAS"))
                .post("/v1/customers")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath();
        assertThat(created.getString("environment")).isEqualTo("SANDBOX");
        assertThat(created.getString("checkDigit")).isEqualTo("8");
        assertThat(created.getString("taxScheme")).isEqualTo("IVA");
        assertThat(created.getString("address.municipalityCode")).isEqualTo("11001");
        assertThat(created.getList("taxLevelCodes")).containsExactly("R-99-PN");
        String id = created.getString("id");

        api(sandboxKey)
                .body(customer("900123456", "Otro Nombre SAS"))
                .post("/v1/customers")
                .then()
                .statusCode(422)
                .body("code", equalTo("customer_exists"));
        // Another environment is another catalog.
        api(testKey)
                .body(customer("900123456", "Comprador SAS"))
                .post("/v1/customers")
                .then()
                .statusCode(201);
        api(testKey).get("/v1/customers/" + id).then().statusCode(404);

        api(sandboxKey)
                .body(customer("900123456", "Comprador Renombrado SAS"))
                .put("/v1/customers/" + id)
                .then()
                .statusCode(200)
                .body("legalName", equalTo("Comprador Renombrado SAS"));
        assertThat(api(sandboxKey).get("/v1/customers?q=renombrado").jsonPath().getList("items.id"))
                .containsExactly(id);
        assertThat(api(sandboxKey).get("/v1/customers?q=9001").jsonPath().getList("items.id"))
                .containsExactly(id);
        assertThat(api(sandboxKey).get("/v1/customers?q=nadie").jsonPath().getList("items"))
                .isEmpty();

        api(sandboxKey).delete("/v1/customers/" + id).then().statusCode(204);
        api(sandboxKey).get("/v1/customers/" + id).then().statusCode(404);
    }

    @Test
    void aCustomerIsValidatedLikeTheCustomerOfAnInvoice() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Validacion SAS");
        String sandboxKey = key(user, "SANDBOX");
        Map<String, Object> wrongDigit = new java.util.HashMap<>(customer("900123456", "Comprador SAS"));
        wrongDigit.put("checkDigit", "1");

        api(sandboxKey)
                .body(wrongDigit)
                .post("/v1/customers")
                .then()
                .statusCode(422)
                .body("code", equalTo("customer_check_digit_invalid"));
        api(sandboxKey)
                .body(Map.of("legalName", "Sin documento"))
                .post("/v1/customers")
                .then()
                .statusCode(400);
    }

    @Test
    void aPassportIsFoundWhateverTheCase() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Pasaporte SAS");
        String sandboxKey = key(user, "SANDBOX");
        String id = api(sandboxKey)
                .body(Map.of(
                        "personType", "NATURAL_PERSON",
                        "identificationType", "PASSPORT",
                        "identificationNumber", "AB12345",
                        "legalName", "Viajero Extranjero"))
                .post("/v1/customers")
                .then()
                .statusCode(201)
                .extract()
                .path("id");

        for (String q : List.of("AB12345", "ab123")) {
            assertThat(api(sandboxKey).get("/v1/customers?q=" + q).jsonPath().getList("items.id"))
                    .containsExactly(id);
        }
    }

    @Test
    void productsArePagedAndUniqueByCode() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Productos SAS");
        String sandboxKey = key(user, "SANDBOX");
        String first = createProduct(sandboxKey, "ASE-1", "Asesoría contable", List.of(tax("IVA", 19)));
        String second = createProduct(sandboxKey, "LIB-1", "Libro de texto", List.of());
        String third = createProduct(sandboxKey, "ALM-1", "Almuerzo ejecutivo", List.of(tax("INC", 8)));

        JsonPath page = api(sandboxKey).get("/v1/products?limit=2").jsonPath();
        assertThat(page.getList("items.id")).containsExactly(third, second);
        assertThat(page.getList("items[1].taxes")).isEmpty();
        assertThat(api(sandboxKey)
                        .get("/v1/products?limit=2&before=" + page.getString("nextCursor"))
                        .jsonPath()
                        .getList("items.id"))
                .containsExactly(first);
        assertThat(api(sandboxKey).get("/v1/products?q=ase").jsonPath().getList("items.id"))
                .containsExactly(first);

        api(sandboxKey)
                .body(product("NUL-1", "Impuesto nulo", Collections.singletonList(null)))
                .post("/v1/products")
                .then()
                .statusCode(400);
        api(sandboxKey)
                .body(product("ASE-1", "Duplicado", List.of()))
                .post("/v1/products")
                .then()
                .statusCode(422)
                .body("code", equalTo("product_exists"));
        api(sandboxKey)
                .body(product("LIB-1", "Libro de texto", List.of()))
                .put("/v1/products/" + first)
                .then()
                .statusCode(422)
                .body("code", equalTo("product_exists"));
        JsonPath updated = api(sandboxKey)
                .body(product("ASE-1", "Asesoría tributaria", List.of(tax("IVA", 5))))
                .put("/v1/products/" + first)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
        assertThat(updated.getString("description")).isEqualTo("Asesoría tributaria");
        assertThat(updated.getDouble("taxes[0].percent")).isEqualTo(5.0);
        assertThat(updated.getString("unitCode")).isEqualTo("94");
    }

    @Test
    void theConsoleManagesTheCatalogOfTheEnvironmentItNames() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Consola Catalogo SAS");
        String id = user.request()
                .body(customer("900123456", "Comprador SAS"))
                .post("/console/customers?environment=LIVE")
                .then()
                .statusCode(201)
                .extract()
                .path("id");

        assertThat(user.request()
                        .get("/console/customers?environment=LIVE")
                        .jsonPath()
                        .getList("items.id"))
                .containsExactly(id);
        assertThat(user.request()
                        .get("/console/customers?environment=SANDBOX")
                        .jsonPath()
                        .getList("items"))
                .isEmpty();
        user.request().get("/console/customers").then().statusCode(400);

        // Another organization never sees it.
        ConsoleUser other = ConsoleUser.newOrganization();
        bootstrap(other, "Ajena Catalogo SAS");
        other.request()
                .get("/console/customers/" + id + "?environment=LIVE")
                .then()
                .statusCode(404);

        String productId = user.request()
                .body(product("SERV-1", "Servicio", List.of(tax("IVA", 19))))
                .post("/console/products?environment=LIVE")
                .then()
                .statusCode(201)
                .extract()
                .path("id");
        user.request()
                .delete("/console/products/" + productId + "?environment=LIVE")
                .then()
                .statusCode(204);
    }

    private static String key(ConsoleUser user, String environment) {
        return user.request()
                .body(Map.of("name", "ERP " + UUID.randomUUID(), "environment", environment))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("secret");
    }

    private static Map<String, Object> customer(String nit, String legalName) {
        return Map.of(
                "personType",
                "LEGAL_ENTITY",
                "identificationType",
                "NIT",
                "identificationNumber",
                nit,
                "legalName",
                legalName,
                "taxScheme",
                "IVA",
                "address",
                Map.of(
                        "municipalityCode", "11001",
                        "cityName", "Bogotá, D.C.",
                        "departmentCode", "11",
                        "departmentName", "Bogotá, D.C.",
                        "line", "Calle 100 # 10-20"));
    }

    private static String createProduct(String apiKey, String code, String description, List<?> taxes) {
        return api(apiKey)
                .body(product(code, description, taxes))
                .post("/v1/products")
                .then()
                .statusCode(201)
                .extract()
                .path("id");
    }

    private static Map<String, Object> product(String code, String description, List<?> taxes) {
        return Map.of("code", code, "description", description, "unitPrice", 100000, "taxes", taxes);
    }

    private static Map<String, Object> tax(String type, int percent) {
        return Map.of("type", type, "percent", percent);
    }
}
