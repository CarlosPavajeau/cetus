package com.cantte.cetus.api.auth;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.persistence.entity.AccountEntity;
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

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * Authenticates /v1/** with "Authorization: Bearer cetus_{env}_..." and applies the per-key rate limit
 * (429 rate_limited with Retry-After).
 */
@Provider
@Priority(Priorities.AUTHENTICATION)
public class ApiKeyFilter implements ContainerRequestFilter {

    private static final String ACTIVE = "ACTIVE";
    /** lastUsedAt is shown to the minute: refreshing it more often would write the key row on every request. */
    private static final Duration LAST_USED_PRECISION = Duration.ofMinutes(1);

    @Inject
    ApiPrincipal principal;
    @Inject
    ApiKeyRateLimiter rateLimiter;

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
        Resolved resolved = QuarkusTransaction.requiringNew().call(() -> {
            ApiKeyEntity found = ApiKeyEntity.findActiveByHash(hash).orElse(null);
            if (found == null) {
                return null;
            }
            OffsetDateTime now = OffsetDateTime.now();
            if (found.lastUsedAt == null || found.lastUsedAt.isBefore(now.minus(LAST_USED_PRECISION))) {
                found.lastUsedAt = now;
            }
            AccountEntity account = AccountEntity.findById(found.accountId);
            return new Resolved(found, account.status);
        });
        if (resolved == null) {
            abort(request, "Invalid or revoked API key");
            return;
        }
        if (!ACTIVE.equals(resolved.accountStatus())) {
            abort(request, Response.Status.FORBIDDEN, "account_suspended", "This account is suspended");
            return;
        }
        ApiKeyEntity key = resolved.key();
        Optional<Duration> wait = rateLimiter.acquire(key.id);
        if (wait.isPresent()) {
            long seconds = Math.max(1, (long) Math.ceil(wait.get().toMillis() / 1000.0));
            request.abortWith(ProblemDetail.builder(429, "rate_limited",
                            "Too many requests for this API key; retry in " + seconds + " s")
                    .header("Retry-After", seconds)
                    .build());
            return;
        }
        principal.set(key.accountId, key.environment, key.id);
    }

    private static void abort(ContainerRequestContext request, String message) {
        abort(request, Response.Status.UNAUTHORIZED, "unauthorized", message);
    }

    private static void abort(ContainerRequestContext request, Response.Status status, String code, String message) {
        request.abortWith(ProblemDetail.response(status.getStatusCode(), code, message));
    }

    private record Resolved(ApiKeyEntity key, String accountStatus) {
    }
}
