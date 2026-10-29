package com.cantte.cetus.api.auth;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.AccountEntity;
import io.micrometer.core.instrument.MeterRegistry;
import io.opentelemetry.api.trace.Span;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.time.Duration;
import java.util.Optional;

/**
 * Authenticates /v1/** with "Authorization: Bearer cetus_{env}_..." and applies the per-key rate limit
 * (429 rate_limited with Retry-After).
 */
@Provider
@Priority(Priorities.AUTHENTICATION)
public class ApiKeyFilter implements ContainerRequestFilter {

    @Inject
    ApiPrincipal principal;

    @Inject
    AccessCache access;

    @Inject
    ApiKeyRateLimiter rateLimiter;

    @Inject
    MeterRegistry meters;

    @Override
    public void filter(ContainerRequestContext request) {
        if (!request.getUriInfo().getPath().startsWith("/v1/")) {
            return;
        }
        String header = request.getHeaderString(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer cetus_")) {
            authenticated(null, "unauthorized");
            abort(request, "Missing or malformed API key");
            return;
        }
        Optional<AccessCache.ApiKeyAccess> found =
                access.apiKey(ApiKeys.hash(header.substring("Bearer ".length()).trim()));
        if (found.isEmpty()) {
            authenticated(null, "unauthorized");
            abort(request, "Invalid or revoked API key");
            return;
        }
        AccessCache.ApiKeyAccess key = found.get();
        access.used(key);
        AccessCache.AccountAccess account = access.account(key.accountId());
        Span.current()
                .setAttribute("cetus.account.id", key.accountId().toString())
                .setAttribute("cetus.api_key.id", key.id().toString())
                .setAttribute("environment", key.environment().name());
        if (account.status() != AccountEntity.Status.ACTIVE) {
            authenticated(key.environment(), "suspended");
            abort(request, Response.Status.FORBIDDEN, "account_suspended", "This account is suspended");
            return;
        }
        Optional<Duration> wait = rateLimiter.acquire(key.id(), key.accountId(), key.environment(), account.limits());
        if (wait.isPresent()) {
            authenticated(key.environment(), "rate_limited");
            long seconds = Math.max(1, (long) Math.ceil(wait.get().toMillis() / 1000.0));
            request.abortWith(ProblemDetail.builder(
                            429, "rate_limited", "Too many requests for this API key; retry in " + seconds + " s")
                    .header("Retry-After", seconds)
                    .build());
            return;
        }
        authenticated(key.environment(), "ok");
        principal.set(key.accountId(), key.environment(), key.id());
    }

    /** {@code environment} is "none" when no key was found. */
    private void authenticated(Environment environment, String outcome) {
        meters.counter(
                        "cetus.api_keys.authentications",
                        "environment",
                        environment == null ? "none" : environment.name(),
                        "outcome",
                        outcome)
                .increment();
    }

    private static void abort(ContainerRequestContext request, String message) {
        abort(request, Response.Status.UNAUTHORIZED, "unauthorized", message);
    }

    private static void abort(ContainerRequestContext request, Response.Status status, String code, String message) {
        request.abortWith(ProblemDetail.response(status.getStatusCode(), code, message));
    }
}
