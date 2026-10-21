package com.cantte.cetus.api.error;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.core.HttpHeaders;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.resteasy.reactive.server.ServerResponseFilter;

import java.util.Optional;

/**
 * Completes every {@link ProblemDetail} on its way out, whether it comes from an exception mapper, a request
 * filter's {@code abortWith} or a resource: {@code instance} is the request path, still escaped so it addresses the same resource, and {@code type} points at the
 * code's documentation when {@code cetus.api.problem-type-base} is set ({@code about:blank} otherwise).
 */
public class ProblemResponseFilter {

    private final Optional<String> typeBase;

    public ProblemResponseFilter(@ConfigProperty(name = "cetus.api.problem-type-base") Optional<String> typeBase) {
        this.typeBase = typeBase;
    }

    @ServerResponseFilter
    public void complete(ContainerRequestContext request, ContainerResponseContext response) {
        if (!(response.getEntity() instanceof ProblemDetail problem)) {
            return;
        }
        String type = typeBase.map(base -> base + problem.code()).orElse(problem.type());
        response.setEntity(problem.withContext(type, request.getUriInfo().getRequestUri().getRawPath()));
        response.getHeaders().putSingle(HttpHeaders.CONTENT_TYPE, ProblemDetail.MEDIA_TYPE);
    }
}
