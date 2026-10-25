package com.cantte.cetus.api.openapi;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.InstanceOfAssertFactories.LIST;
import static org.assertj.core.api.InstanceOfAssertFactories.MAP;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
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

    @Test
    void everyPublicOperationIsDocumented() {
        JsonPath spec = spec();
        Map<String, Map<String, Map<String, Object>>> paths = spec.getMap("paths");
        List<String> publicPaths =
                paths.keySet().stream().filter(path -> path.startsWith("/v1/")).toList();
        assertThat(publicPaths).isNotEmpty();
        for (String path : publicPaths) {
            paths.get(path).forEach((method, operation) -> {
                String name = method + " " + path;
                assertThat(operation.get("summary")).as(name).isNotNull();
                assertThat(operation.get("tags")).as(name).asInstanceOf(LIST).hasSize(1);
                assertThat(operation.get("security")).as(name).isEqualTo(List.of(Map.of("apiKey", List.of())));
                assertThat(operation.get("responses"))
                        .as(name)
                        .asInstanceOf(MAP)
                        .containsKeys("401", "403", "429");
            });
        }
    }

    @Test
    void everyMemberReachableFromThePublicApiIsDescribed() {
        JsonPath spec = spec();
        Map<String, Map<String, Object>> schemas = spec.getMap("components.schemas");
        Set<String> reachable = new TreeSet<>();
        Deque<Object> pending = new ArrayDeque<>();
        Map<String, Object> paths = spec.getMap("paths");
        paths.forEach((path, item) -> {
            if (path.startsWith("/v1/")) {
                pending.push(item);
            }
        });
        pending.push(spec.getMap("components.responses"));
        while (!pending.isEmpty()) {
            Object node = pending.pop();
            if (node instanceof Map<?, ?> map) {
                if (map.get("$ref") instanceof String ref && ref.startsWith("#/components/schemas/")) {
                    String name = ref.substring(ref.lastIndexOf('/') + 1);
                    if (reachable.add(name)) {
                        pending.push(schemas.get(name));
                    }
                }
                map.values().forEach(pending::push);
            } else if (node instanceof List<?> list) {
                list.forEach(pending::push);
            }
        }
        assertThat(reachable).contains("InvoiceRequest", "IssuerStatus", "ProblemDetail");
        for (String name : reachable) {
            Map<String, Object> schema = schemas.get(name);
            if (schema.get("enum") != null) {
                assertThat(schema.get("description")).as(name).isNotNull();
            }
            if (schema.get("properties") instanceof Map<?, ?> properties) {
                properties.forEach((member, property) -> assertThat(property)
                        .as(name + "." + member)
                        .asInstanceOf(MAP)
                        .containsKey("description"));
            }
        }
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
