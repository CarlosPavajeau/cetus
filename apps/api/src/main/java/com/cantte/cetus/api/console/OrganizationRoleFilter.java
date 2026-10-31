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
import java.util.Set;

/**
 * Some changes are only for the organization's owners and admins (its member roles, carried in the token's
 * "orgRoles" claim): who receives the account's notices, the API keys, the webhooks and the issuers, whose
 * certificate and promotion decide what is issued in the company's name, whom Cetus invoices and what the account buys. Other members only read them and
 * answer 403. A token without the claim has no roles, so it is refused too.
 */
@Provider
@Priority(Priorities.AUTHORIZATION)
public class OrganizationRoleFilter implements ContainerRequestFilter {

    static final Set<String> MANAGERS = Set.of("owner", "admin");

    private static final Set<String> READS = Set.of(HttpMethod.GET, HttpMethod.HEAD, HttpMethod.OPTIONS);

    private static final List<String> MANAGED = List.of(
            "/console/contacts",
            "/console/api-keys",
            "/console/webhook-endpoints",
            "/console/issuers",
            "/console/billing-profile",
            "/console/orders");

    @Inject
    ConsoleContext context;

    @Override
    public void filter(ContainerRequestContext request) {
        String path = request.getUriInfo().getPath();
        if (READS.contains(request.getMethod())) {
            return;
        }
        boolean restricted = MANAGED.stream().anyMatch(root -> path.equals(root) || path.startsWith(root + "/"));
        if (restricted && context.organizationRoles().stream().noneMatch(MANAGERS::contains)) {
            request.abortWith(ProblemDetail.response(
                    403, "organization_role_forbidden", "Only the organization's owners and admins can do this"));
        }
    }
}
