package com.cantte.cetus.api.openapi;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import java.util.List;
import org.junit.jupiter.api.Test;

@QuarkusTest
class OpenApiFilterTest {

    @Test
    void responseMembersAreRequiredEvenWhenNullable() {
        JsonPath spec = spec();
        assertThat(required(spec, "DocumentSummary")).contains("id", "externalReference");
        assertThat(required(spec, "AdminSessionView")).containsExactlyInAnyOrder("userId", "roles");
        assertThat(required(spec, "Address")).contains("postalCode");
        assertThat(spec.getList("components.schemas.Address.properties.postalCode.type"))
                .containsExactlyInAnyOrder("string", "null");
    }

    @Test
    void problemMembersLeftOutWhenEmptyStayOptional() {
        assertThat(required(spec(), "ProblemDetail"))
                .containsExactlyInAnyOrder("type", "title", "status", "instance", "code");
    }

    @Test
    void requestsKeepWhatValidationDeclares() {
        assertThat(required(spec(), "InvoiceRequest")).containsExactlyInAnyOrder("customer", "payment", "lines");
    }

    private static JsonPath spec() {
        return given().queryParam("format", "json")
                .get("/q/openapi")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
    }

    private static List<String> required(JsonPath spec, String schema) {
        return spec.getList("components.schemas." + schema + ".required", String.class);
    }
}
