package com.cantte.cetus.api.openapi;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.api.catalog.ProductRequest;
import com.cantte.cetus.api.creditnotes.CreditNoteRequest;
import com.cantte.cetus.api.debitnotes.DebitNoteRequest;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.invoices.InvoiceRequest;
import com.cantte.cetus.api.invoices.InvoiceResponse;
import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import jakarta.inject.Inject;
import jakarta.validation.Validator;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** The examples of the public reference are what integrators copy first, so each one must be a valid request. */
@QuarkusTest
class OpenApiExamplesTest {

    private static final Map<String, Class<?>> EXAMPLES = Map.ofEntries(
            Map.entry("MinimalInvoice", InvoiceRequest.class),
            Map.entry("CompanyCreditInvoice", InvoiceRequest.class),
            Map.entry("CancellationCreditNote", CreditNoteRequest.class),
            Map.entry("PartialReturnCreditNote", CreditNoteRequest.class),
            Map.entry("InterestDebitNote", DebitNoteRequest.class),
            Map.entry("Product", ProductRequest.class),
            Map.entry("Customer", InvoiceRequest.Customer.class),
            Map.entry("InvoiceReceived", InvoiceResponse.class),
            Map.entry("InvoiceAccepted", InvoiceResponse.class),
            Map.entry("InvalidRequestProblem", ProblemDetail.class),
            Map.entry("IssuerRequiredProblem", ProblemDetail.class));

    @Inject
    ObjectMapper mapper;

    @Inject
    Validator validator;

    @Test
    void everyExampleMatchesItsRecord() throws Exception {
        JsonPath spec = spec();
        Map<String, Object> examples = spec.getMap("components.examples");
        assertThat(examples.keySet()).containsExactlyInAnyOrderElementsOf(EXAMPLES.keySet());

        ObjectMapper strict = mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        for (var entry : EXAMPLES.entrySet()) {
            Map<String, Object> value = spec.getMap("components.examples." + entry.getKey() + ".value");
            Object parsed = strict.convertValue(value, entry.getValue());
            assertThat(validator.validate(parsed)).as(entry.getKey()).isEmpty();
            if (entry.getValue() == InvoiceResponse.class) {
                assertThat(value.keySet())
                        .as(entry.getKey())
                        .containsExactlyInAnyOrderElementsOf(
                                spec.<String, Object>getMap("components.schemas.InvoiceResponse.properties")
                                        .keySet());
            }
        }
    }

    @Test
    void theMinimalInvoiceIssuesInTheSandboxAsIs() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Examples SAS");
        String apiKey = user.request()
                .body(Map.of("name", "Quickstart", "environment", "SANDBOX"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("secret");

        given().header("Authorization", "Bearer " + apiKey)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(ContentType.JSON)
                .body(spec().getMap("components.examples.MinimalInvoice.value"))
                .post("/v1/invoices")
                .then()
                .statusCode(202);
    }

    private static JsonPath spec() {
        return given().queryParam("format", "json")
                .get("/q/openapi")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
    }
}
