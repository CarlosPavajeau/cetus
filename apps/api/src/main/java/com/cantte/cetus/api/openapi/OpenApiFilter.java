package com.cantte.cetus.api.openapi;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;
import org.eclipse.microprofile.openapi.OASFactory;
import org.eclipse.microprofile.openapi.OASFilter;
import org.eclipse.microprofile.openapi.models.OpenAPI;
import org.eclipse.microprofile.openapi.models.Operation;
import org.eclipse.microprofile.openapi.models.media.Content;
import org.eclipse.microprofile.openapi.models.media.MediaType;
import org.eclipse.microprofile.openapi.models.media.Schema;
import org.eclipse.microprofile.openapi.models.parameters.RequestBody;
import org.eclipse.microprofile.openapi.models.responses.APIResponse;

/**
 * Adjusts what annotations cannot express. The console generates its TypeScript types from this spec.
 *
 * <p>Every member of a response is required, so the records need no {@code @Schema(required = true)}; a member
 * that can be null says so with {@code @Schema(nullable = true)}. Requests keep what Bean Validation declares.
 */
public class OpenApiFilter implements OASFilter {

    /** Members a response omits, rather than sends as null, when it has nothing to say. */
    private static final Map<String, Set<String>> OPTIONAL_MEMBERS =
            Map.of("ProblemDetail", Set.of("detail", "errors"));

    @Override
    public void filterOpenAPI(OpenAPI openAPI) {
        Map<String, Schema> schemas = openAPI.getComponents().getSchemas();
        Schema auditValue = schemas.get("AuditValue");
        if (auditValue != null) {
            auditValue.setType(null);
            auditValue.addOneOf(OASFactory.createSchema().addType(Schema.SchemaType.NULL));
        }
        // Address belongs to the domain module, which cannot depend on the OpenAPI annotations.
        Objects.requireNonNull(schemas.get("Address"), "Address")
                .getProperties()
                .get("postalCode")
                .addType(Schema.SchemaType.NULL);
        requireResponseMembers(openAPI, schemas);
    }

    static void requireResponseMembers(OpenAPI openAPI, Map<String, Schema> schemas) {
        List<Operation> operations = openAPI.getPaths().getPathItems().values().stream()
                .flatMap(item -> item.getOperations().values().stream())
                .toList();
        Set<String> requests = reachable(
                operations.stream()
                        .map(Operation::getRequestBody)
                        .filter(Objects::nonNull)
                        .map(RequestBody::getContent),
                schemas);
        Set<String> responses = reachable(
                operations.stream()
                        .flatMap(operation -> operation.getResponses().getAPIResponses().values().stream())
                        .map(APIResponse::getContent),
                schemas);
        for (String name : responses) {
            Schema schema = schemas.get(name);
            Map<String, Schema> properties = schema.getProperties();
            if (properties == null || properties.isEmpty()) {
                continue;
            }
            if (requests.contains(name)) {
                throw new IllegalStateException(
                        name + " is both a request and a response; give each side its own record");
            }
            Set<String> optional = OPTIONAL_MEMBERS.getOrDefault(name, Set.of());
            schema.setRequired(properties.keySet().stream()
                    .filter(member -> !optional.contains(member))
                    .toList());
        }
    }

    private static Set<String> reachable(Stream<Content> contents, Map<String, Schema> schemas) {
        Set<String> names = new HashSet<>();
        Deque<Schema> pending = new ArrayDeque<>();
        contents.filter(Objects::nonNull)
                .flatMap(content -> content.getMediaTypes().values().stream())
                .map(MediaType::getSchema)
                .filter(Objects::nonNull)
                .forEach(pending::push);
        while (!pending.isEmpty()) {
            Schema schema = pending.pop();
            String ref = schema.getRef();
            if (ref != null) {
                String name = ref.substring(ref.lastIndexOf('/') + 1);
                if (names.add(name)) {
                    pending.push(Objects.requireNonNull(schemas.get(name), ref));
                }
            }
            children(schema).forEach(pending::push);
        }
        return names;
    }

    private static Stream<Schema> children(Schema schema) {
        List<Schema> children = new ArrayList<>();
        Optional.ofNullable(schema.getProperties()).map(Map::values).ifPresent(children::addAll);
        Optional.ofNullable(schema.getAllOf()).ifPresent(children::addAll);
        Optional.ofNullable(schema.getAnyOf()).ifPresent(children::addAll);
        Optional.ofNullable(schema.getOneOf()).ifPresent(children::addAll);
        Optional.ofNullable(schema.getItems()).ifPresent(children::add);
        Optional.ofNullable(schema.getAdditionalPropertiesSchema()).ifPresent(children::add);
        return children.stream();
    }
}
