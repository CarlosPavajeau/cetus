package com.cantte.cetus.api.openapi;

import static org.assertj.core.api.Assertions.assertThatIllegalStateException;
import static org.eclipse.microprofile.openapi.OASFactory.createAPIResponse;
import static org.eclipse.microprofile.openapi.OASFactory.createAPIResponses;
import static org.eclipse.microprofile.openapi.OASFactory.createComponents;
import static org.eclipse.microprofile.openapi.OASFactory.createContent;
import static org.eclipse.microprofile.openapi.OASFactory.createMediaType;
import static org.eclipse.microprofile.openapi.OASFactory.createOpenAPI;
import static org.eclipse.microprofile.openapi.OASFactory.createOperation;
import static org.eclipse.microprofile.openapi.OASFactory.createPathItem;
import static org.eclipse.microprofile.openapi.OASFactory.createPaths;
import static org.eclipse.microprofile.openapi.OASFactory.createRequestBody;
import static org.eclipse.microprofile.openapi.OASFactory.createSchema;

import java.util.Map;
import org.eclipse.microprofile.openapi.models.OpenAPI;
import org.eclipse.microprofile.openapi.models.media.Content;
import org.eclipse.microprofile.openapi.models.media.Schema;
import org.junit.jupiter.api.Test;

class SharedSchemaTest {

    @Test
    void rejectsAnObjectUsedByARequestAndAResponse() {
        OpenAPI openAPI = api(Map.of("Shared", object()), "Shared", "Shared");

        assertThatIllegalStateException()
                .isThrownBy(() -> OpenApiFilter.requireResponseMembers(
                        openAPI, openAPI.getComponents().getSchemas()))
                .withMessageStartingWith("Shared ");
    }

    @Test
    void followsReferencesToFindANestedSharedObject() {
        Schema request = createSchema().addProperty("shared", ref("Shared"));
        Schema response = createSchema().addProperty("all", createSchema().items(ref("Shared")));
        OpenAPI openAPI =
                api(Map.of("Request", request, "Response", response, "Shared", object()), "Request", "Response");

        assertThatIllegalStateException()
                .isThrownBy(() -> OpenApiFilter.requireResponseMembers(
                        openAPI, openAPI.getComponents().getSchemas()))
                .withMessageStartingWith("Shared ");
    }

    private static OpenAPI api(Map<String, Schema> schemas, String request, String response) {
        return createOpenAPI()
                .components(createComponents().schemas(schemas))
                .paths(createPaths()
                        .addPathItem(
                                "/things",
                                createPathItem()
                                        .POST(createOperation()
                                                .requestBody(createRequestBody().content(json(request)))
                                                .responses(createAPIResponses()
                                                        .addAPIResponse(
                                                                "200",
                                                                createAPIResponse()
                                                                        .content(json(response)))))));
    }

    private static Content json(String schema) {
        return createContent()
                .addMediaType("application/json", createMediaType().schema(ref(schema)));
    }

    private static Schema ref(String schema) {
        return createSchema().ref("#/components/schemas/" + schema);
    }

    private static Schema object() {
        return createSchema().addProperty("name", createSchema().addType(Schema.SchemaType.STRING));
    }
}
