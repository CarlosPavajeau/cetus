package com.cantte.cetus.api.error;

import com.cantte.cetus.api.console.ConsoleIssuance;
import com.cantte.cetus.api.documents.DocumentDrafts;
import com.cantte.cetus.api.documents.DocumentFiles;
import com.cantte.cetus.api.json.SafeStrings;
import com.cantte.cetus.domain.DomainException;
import com.fasterxml.jackson.core.exc.StreamReadException;
import com.fasterxml.jackson.databind.DatabindException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import io.quarkus.security.ForbiddenException;
import io.quarkus.security.UnauthorizedException;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.ElementKind;
import jakarta.validation.Path;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.time.temporal.Temporal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;

public class ErrorMappers {

    private static final Logger LOG = Logger.getLogger(ErrorMappers.class);
    private static final Set<ElementKind> INVOCATION = Set.of(
            ElementKind.METHOD,
            ElementKind.CONSTRUCTOR,
            ElementKind.PARAMETER,
            ElementKind.CROSS_PARAMETER,
            ElementKind.RETURN_VALUE);

    @ServerExceptionMapper
    public Response domain(DomainException e) {
        return ProblemDetail.response(422, e.code(), e.getMessage());
    }

    @ServerExceptionMapper
    public Response validation(ConstraintViolationException e) {
        var errors = e.getConstraintViolations().stream()
                .map(v -> new ProblemDetail.FieldError(field(v.getPropertyPath()), v.getMessage()))
                .sorted(Comparator.comparing(ProblemDetail.FieldError::field)
                        .thenComparing(ProblemDetail.FieldError::message))
                .toList();
        return Response.status(400)
                .type(ProblemDetail.MEDIA_TYPE)
                .entity(ProblemDetail.of(400, "invalid_request", "The request is invalid", errors))
                .build();
    }

    /**
     * A body that is JSON but does not bind to the request: a wrong type, an unknown enum constant, an invalid
     * UUID or date. Without it, Quarkus answers with its own {@code application/json} body, which echoes the value.
     */
    @ServerExceptionMapper
    public Response mismatchedInput(MismatchedInputException e) {
        String field = jsonPath(e.getPath());
        if (field.isEmpty()) {
            return ProblemDetail.response(400, "invalid_request", "The request body must be a JSON object");
        }
        var errors = List.of(new ProblemDetail.FieldError(field, mismatchMessage(e)));
        return Response.status(400)
                .type(ProblemDetail.MEDIA_TYPE)
                .entity(ProblemDetail.of(400, "invalid_request", "The request is invalid", errors))
                .build();
    }

    @ServerExceptionMapper
    public Response notFound(NotFoundException e) {
        return ProblemDetail.response(404, "not_found", e.getMessage());
    }

    /** {@code @RolesAllowed} refused an authenticated caller (e.g. a console user on /admin/**). */
    @ServerExceptionMapper
    public Response forbidden(ForbiddenException e) {
        return ProblemDetail.response(403, "forbidden", "You are not allowed to do this");
    }

    @ServerExceptionMapper
    public Response unauthorized(UnauthorizedException e) {
        return ProblemDetail.response(401, "unauthorized", "Authentication required");
    }

    @ServerExceptionMapper
    public Response fileNotAvailable(DocumentFiles.FileNotAvailable e) {
        return e.getResponse();
    }

    @ServerExceptionMapper
    public Response issuanceForbidden(ConsoleIssuance.IssuanceForbidden e) {
        return e.getResponse();
    }

    @ServerExceptionMapper
    public Response sandboxDailyLimit(DocumentDrafts.SandboxDailyLimit e) {
        return e.getResponse();
    }

    @ServerExceptionMapper
    public Response web(WebApplicationException e) {
        int status = e.getResponse().getStatus();
        // Quarkus wraps the body errors other than MismatchedInputException; their messages name our classes.
        if (e.getCause() instanceof StreamReadException) {
            return ProblemDetail.response(400, "invalid_request", "The request body is not valid JSON");
        }
        if (e.getCause() instanceof DatabindException) {
            return ProblemDetail.response(400, "invalid_request", "The request body could not be read");
        }
        return ProblemDetail.response(status, "http_" + status, e.getMessage());
    }

    @ServerExceptionMapper
    public Response unexpected(Exception e) {
        LOG.error("Unexpected error", e);
        return ProblemDetail.response(500, "internal_error", "Unexpected error");
    }

    /** The field as the client wrote it in the body: {@code lines[0].quantity}. */
    static String jsonPath(List<JsonMappingException.Reference> path) {
        StringBuilder field = new StringBuilder();
        for (JsonMappingException.Reference reference : path) {
            if (reference.getFieldName() != null) {
                field.append(field.isEmpty() ? "" : ".").append(reference.getFieldName());
            } else if (reference.getIndex() >= 0) {
                field.append('[').append(reference.getIndex()).append(']');
            }
        }
        return field.toString();
    }

    /** What the value should have been, without repeating it or naming our classes. */
    static String mismatchMessage(MismatchedInputException e) {
        Class<?> type = e.getTargetType();
        if (type == null) {
            return "has an invalid value";
        }
        if (type == String.class && e instanceof InvalidFormatException) {
            // Only SafeStrings refuses a string that is already a JSON string.
            return SafeStrings.MESSAGE;
        }
        if (type.isEnum()) {
            return "must be one of: "
                    + Arrays.stream(type.getEnumConstants())
                            .map(constant -> ((Enum<?>) constant).name())
                            .collect(Collectors.joining(", "));
        }
        if (type == UUID.class) {
            return "must be a UUID";
        }
        if (Number.class.isAssignableFrom(type)
                || (type.isPrimitive() && type != boolean.class && type != char.class)) {
            return "must be a number";
        }
        if (type == Boolean.class || type == boolean.class) {
            return "must be true or false";
        }
        if (Temporal.class.isAssignableFrom(type)) {
            return "must be a date in ISO 8601 format";
        }
        if (type.isArray() || Collection.class.isAssignableFrom(type)) {
            return "must be a list";
        }
        if (type == String.class) {
            return "must be a string";
        }
        return "must be an object";
    }

    /**
     * The violated field as the client named it: {@code create.request.lines[0].quantity} is
     * {@code lines[0].quantity}. The method and parameter nodes are ours, not the client's; a query or path
     * parameter keeps its own name.
     */
    static String field(Path path) {
        List<Path.Node> nodes = new ArrayList<>();
        path.forEach(nodes::add);
        int skip = 0;
        while (skip < nodes.size() - 1 && INVOCATION.contains(nodes.get(skip).getKind())) {
            skip++;
        }
        String full = path.toString();
        String prefix = String.join(
                        ".",
                        nodes.subList(0, skip).stream().map(Path.Node::getName).toList()) + ".";
        if (skip == 0 || !full.startsWith(prefix) || full.length() == prefix.length()) {
            return skip == 0 ? full : nodes.get(skip - 1).getName();
        }
        return full.substring(prefix.length());
    }
}
