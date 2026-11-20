package com.cantte.cetus.api.batches;

import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.cache.RateLimiter;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.HttpMethod;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;
import java.time.Duration;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Sending a batch is the console's heaviest request: its body is refused above {@code cetus.batches.body-max-bytes}
 * before it is read, well below the server's own limit, and so is a body without a declared length, and each account sends at most a few batches a minute.
 */
@Provider
@Priority(Priorities.USER)
public class BatchRequestLimits implements ContainerRequestFilter {

    static final String PATH = "/console/document-batches";

    @Inject
    ConsoleContext context;

    @Inject
    RateLimiter buckets;

    @ConfigProperty(name = "cetus.batches.body-max-bytes")
    long bodyMaxBytes;

    @ConfigProperty(name = "cetus.batches.rate-limit.per-minute")
    int perMinute;

    @ConfigProperty(name = "cetus.batches.rate-limit.burst")
    int burst;

    @Override
    public void filter(ContainerRequestContext request) {
        if (!HttpMethod.POST.equals(request.getMethod())
                || !PATH.equals(request.getUriInfo().getPath())) {
            return;
        }
        if (request.getLength() < 0) {
            request.abortWith(ProblemDetail.response(
                    411, "length_required", "Send the batch with its Content-Length; a chunked body is not accepted"));
            return;
        }
        if (request.getLength() > bodyMaxBytes) {
            request.abortWith(ProblemDetail.response(
                    413, "batch_too_large", "The batch is larger than " + bodyMaxBytes + " bytes; split it"));
            return;
        }
        Optional<Duration> wait =
                buckets.acquire("batches:" + context.accountId(), new RateLimiter.Limits(perMinute / 60.0, burst));
        if (wait.isPresent()) {
            long seconds = Math.max(1, (long) Math.ceil(wait.get().toMillis() / 1000.0));
            request.abortWith(
                    ProblemDetail.builder(429, "rate_limited", "Too many batches sent; retry in " + seconds + " s")
                            .header("Retry-After", seconds)
                            .build());
        }
    }
}
