package com.cantte.cetus.api.console;

import com.cantte.cetus.api.error.ProblemDetail;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.HttpMethod;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;
import java.util.List;
import java.util.regex.Pattern;

/**
 * While a Cetus admin impersonates a console user, the actions that hand over or replace credentials stay
 * with the customer: uploading a certificate, creating or revoking API keys and changing who receives the
 * account's notices answer 403. So does emailing a document again, which can name any address, asking
 * Cetus for help or sharing feedback, which speak for the person, and buying or changing who Cetus invoices,
 * which commit the customer's money.
 */
@Provider
@Priority(Priorities.AUTHORIZATION)
public class ImpersonationFilter implements ContainerRequestFilter {

    private record Rule(String method, Pattern path) {}

    private static final List<Rule> FORBIDDEN = List.of(
            new Rule(HttpMethod.PUT, Pattern.compile("/console/issuers/[^/]+/certificate")),
            new Rule(HttpMethod.POST, Pattern.compile("/console/api-keys")),
            new Rule(HttpMethod.DELETE, Pattern.compile("/console/api-keys/[^/]+")),
            new Rule(HttpMethod.PUT, Pattern.compile("/console/contacts/[^/]+")),
            new Rule(HttpMethod.POST, Pattern.compile("/console/contacts/[^/]+/verification")),
            new Rule(HttpMethod.DELETE, Pattern.compile("/console/contacts/[^/]+/pending")),
            new Rule(HttpMethod.POST, Pattern.compile("/console/documents/[^/]+/deliveries")),
            new Rule(HttpMethod.POST, Pattern.compile("/console/support-tickets")),
            new Rule(HttpMethod.POST, Pattern.compile("/console/support-attachments")),
            new Rule(HttpMethod.POST, Pattern.compile("/console/feedback")),
            new Rule(HttpMethod.PUT, Pattern.compile("/console/billing-profile")),
            new Rule(HttpMethod.POST, Pattern.compile("/console/orders")));

    @Inject
    ConsoleContext context;

    @Override
    public void filter(ContainerRequestContext request) {
        String path = request.getUriInfo().getPath();
        if (!path.startsWith("/console/")) {
            return;
        }
        boolean forbidden = FORBIDDEN.stream()
                .anyMatch(rule -> rule.method().equals(request.getMethod())
                        && rule.path().matcher(path).matches());
        if (forbidden && context.impersonatedBy().isPresent()) {
            request.abortWith(ProblemDetail.response(
                    403, "impersonation_forbidden", "This action is not available while impersonating a user"));
        }
    }
}
