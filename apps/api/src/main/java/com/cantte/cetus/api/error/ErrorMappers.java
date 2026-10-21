package com.cantte.cetus.api.error;

import com.cantte.cetus.api.documents.DocumentFiles;
import com.cantte.cetus.domain.DomainException;
import io.quarkus.security.ForbiddenException;
import io.quarkus.security.UnauthorizedException;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.ElementKind;
import jakarta.validation.Path;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

public class ErrorMappers {

    private static final Logger LOG = Logger.getLogger(ErrorMappers.class);
    private static final Set<ElementKind> INVOCATION = Set.of(ElementKind.METHOD, ElementKind.CONSTRUCTOR,
            ElementKind.PARAMETER, ElementKind.CROSS_PARAMETER, ElementKind.RETURN_VALUE);

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
        return Response.status(400).type(ProblemDetail.MEDIA_TYPE)
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
    public Response web(WebApplicationException e) {
        int status = e.getResponse().getStatus();
        return ProblemDetail.response(status, "http_" + status, e.getMessage());
    }

    @ServerExceptionMapper
    public Response unexpected(Exception e) {
        LOG.error("Unexpected error", e);
        return ProblemDetail.response(500, "internal_error", "Unexpected error");
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
        String prefix = String.join(".", nodes.subList(0, skip).stream().map(Path.Node::getName).toList()) + ".";
        if (skip == 0 || !full.startsWith(prefix) || full.length() == prefix.length()) {
            return skip == 0 ? full : nodes.get(skip - 1).getName();
        }
        return full.substring(prefix.length());
    }
}
