package com.cantte.cetus.api.auth;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.usage.ApiKeyRequest;
import com.cantte.cetus.persistence.usage.ApiKeyUsage;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * Records every /v1 request made with a valid API key: method, path, status and duration. Each request gets an id,
 * returned as X-Request-Id, that the console shows next to it. Requests rejected by {@link ApiKeyFilter} have no
 * key to attribute them to, so they are not recorded.
 */
@Provider
@Priority(Priorities.AUTHENTICATION - 1)
public class ApiKeyUsageFilter implements ContainerRequestFilter, ContainerResponseFilter {

    static final String REQUEST_ID_HEADER = "X-Request-Id";

    private static final Logger LOG = Logger.getLogger(ApiKeyUsageFilter.class);
    private static final String REQUEST_ID = ApiKeyUsageFilter.class.getName() + ".requestId";
    private static final String RECEIVED_AT = ApiKeyUsageFilter.class.getName() + ".receivedAt";
    private static final String STARTED_NANOS = ApiKeyUsageFilter.class.getName() + ".startedNanos";

    @Inject
    ApiPrincipal principal;

    @Inject
    ApiKeyUsage usage;

    @Inject
    RequestOriginResolver origin;

    @Override
    public void filter(ContainerRequestContext request) {
        if (!request.getUriInfo().getPath().startsWith("/v1/")) {
            return;
        }
        request.setProperty(REQUEST_ID, Ids.newId());
        request.setProperty(RECEIVED_AT, OffsetDateTime.now());
        request.setProperty(STARTED_NANOS, System.nanoTime());
    }

    @Override
    public void filter(ContainerRequestContext request, ContainerResponseContext response) {
        if (!(request.getProperty(REQUEST_ID) instanceof UUID requestId)) {
            return;
        }
        response.getHeaders().putSingle(REQUEST_ID_HEADER, requestId.toString());
        if (principal.apiKeyId() == null) {
            return;
        }
        long elapsedNanos = System.nanoTime() - (long) request.getProperty(STARTED_NANOS);
        // The path comes without the query string, which may carry customer data.
        ApiKeyRequest recorded = new ApiKeyRequest(
                requestId,
                principal.accountId(),
                principal.apiKeyId(),
                request.getMethod(),
                request.getUriInfo().getPath(),
                response.getStatus(),
                (int) Math.min(elapsedNanos / 1_000_000, Integer.MAX_VALUE),
                origin.resolve(),
                (OffsetDateTime) request.getProperty(RECEIVED_AT));
        try {
            usage.record(recorded);
        } catch (RuntimeException e) {
            // Losing a usage row must not turn an answered request into an error.
            LOG.errorf(e, "Could not record request %s of API key %s", requestId, principal.apiKeyId());
        }
    }
}
