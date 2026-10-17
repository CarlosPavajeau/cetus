package com.cantte.cetus.api.auth;

import com.cantte.cetus.api.error.ApiError;
import com.cantte.cetus.persistence.entity.ApiKeyEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;

import java.time.OffsetDateTime;

/** Authenticates /v1/** with "Authorization: Bearer cetus_{env}_...". */
@Provider
@Priority(Priorities.AUTHENTICATION)
public class ApiKeyFilter implements ContainerRequestFilter {

    @Inject
    ApiPrincipal principal;

    @Override
    public void filter(ContainerRequestContext request) {
        if (!request.getUriInfo().getPath().startsWith("/v1/")) {
            return;
        }
        String header = request.getHeaderString(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer cetus_")) {
            abort(request, "Missing or malformed API key");
            return;
        }
        String hash = ApiKeys.hash(header.substring("Bearer ".length()).trim());
        ApiKeyEntity key = QuarkusTransaction.requiringNew().call(() -> {
            ApiKeyEntity found = ApiKeyEntity.findActiveByHash(hash).orElse(null);
            if (found != null) {
                found.lastUsedAt = OffsetDateTime.now();
            }
            return found;
        });
        if (key == null) {
            abort(request, "Invalid or revoked API key");
            return;
        }
        principal.set(key.accountId, key.environment);
    }

    private static void abort(ContainerRequestContext request, String message) {
        request.abortWith(Response.status(Response.Status.UNAUTHORIZED)
                .entity(new ApiError("unauthorized", message, null))
                .build());
    }
}
