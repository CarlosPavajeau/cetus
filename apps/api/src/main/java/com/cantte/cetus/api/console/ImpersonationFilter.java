package com.cantte.cetus.api.console;

import com.cantte.cetus.api.error.ApiError;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.HttpMethod;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;

import java.util.List;
import java.util.regex.Pattern;

/**
 * While a Cetus admin impersonates a console user, the actions that hand over or replace credentials stay
 * with the customer: uploading a certificate and creating or revoking API keys answer 403.
 */
@Provider
@Priority(Priorities.AUTHORIZATION)
public class ImpersonationFilter implements ContainerRequestFilter {

    private record Rule(String method, Pattern path) {
    }

    private static final List<Rule> FORBIDDEN = List.of(
            new Rule(HttpMethod.PUT, Pattern.compile("/console/issuers/[^/]+/certificate")),
            new Rule(HttpMethod.POST, Pattern.compile("/console/api-keys")),
            new Rule(HttpMethod.DELETE, Pattern.compile("/console/api-keys/[^/]+")));

    @Inject
    ConsoleContext context;

    @Override
    public void filter(ContainerRequestContext request) {
        String path = request.getUriInfo().getPath();
        if (!path.startsWith("/console/")) {
            return;
        }
        boolean forbidden = FORBIDDEN.stream()
                .anyMatch(rule -> rule.method().equals(request.getMethod()) && rule.path().matcher(path).matches());
        if (forbidden && context.impersonatedBy().isPresent()) {
            request.abortWith(Response.status(Response.Status.FORBIDDEN)
                    .entity(new ApiError("impersonation_forbidden",
                            "This action is not available while impersonating a user", null))
                    .build());
        }
    }
}
