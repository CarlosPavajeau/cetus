package com.cantte.cetus.api.error;

import com.cantte.cetus.api.documents.DocumentFiles;
import com.cantte.cetus.domain.DomainException;
import io.quarkus.security.ForbiddenException;
import io.quarkus.security.UnauthorizedException;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;

public class ErrorMappers {

    private static final Logger LOG = Logger.getLogger(ErrorMappers.class);

    @ServerExceptionMapper
    public Response domain(DomainException e) {
        return Response.status(422).entity(new ApiError(e.code(), e.getMessage(), null)).build();
    }

    @ServerExceptionMapper
    public Response validation(ConstraintViolationException e) {
        var details = e.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .sorted()
                .toList();
        return Response.status(400).entity(new ApiError("invalid_request", "The request is invalid", details)).build();
    }

    @ServerExceptionMapper
    public Response notFound(NotFoundException e) {
        return Response.status(404).entity(new ApiError("not_found", e.getMessage(), null)).build();
    }

    /** {@code @RolesAllowed} refused an authenticated caller (e.g. a console user on /admin/**). */
    @ServerExceptionMapper
    public Response forbidden(ForbiddenException e) {
        return Response.status(403).entity(new ApiError("forbidden", "You are not allowed to do this", null)).build();
    }

    @ServerExceptionMapper
    public Response unauthorized(UnauthorizedException e) {
        return Response.status(401).entity(new ApiError("unauthorized", "Authentication required", null)).build();
    }

    @ServerExceptionMapper
    public Response fileNotAvailable(DocumentFiles.FileNotAvailable e) {
        return e.getResponse();
    }

    @ServerExceptionMapper
    public Response web(WebApplicationException e) {
        int status = e.getResponse().getStatus();
        return Response.status(status).entity(new ApiError("http_" + status, e.getMessage(), null)).build();
    }

    @ServerExceptionMapper
    public Response unexpected(Exception e) {
        LOG.error("Unexpected error", e);
        return Response.serverError().entity(new ApiError("internal_error", "Unexpected error", null)).build();
    }
}
