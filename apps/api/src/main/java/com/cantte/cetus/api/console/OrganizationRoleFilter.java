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
import java.util.regex.Pattern;

/**
 * Some changes are only for the organization's owners and admins (its member roles, carried in the token's
 * "orgRoles" claim): who receives the account's notices. Other members answer 403. A token without the
 * claim has no roles, so it is refused too.
 */
@Provider
@Priority(Priorities.AUTHORIZATION)
public class OrganizationRoleFilter implements ContainerRequestFilter {

    static final Set<String> MANAGERS = Set.of("owner", "admin");

    private record Rule(String method, Pattern path) {}

    private static final List<Rule> MANAGERS_ONLY = List.of(
            new Rule(HttpMethod.PUT, Pattern.compile("/console/contacts/[^/]+")),
            new Rule(HttpMethod.POST, Pattern.compile("/console/contacts/[^/]+/verification")),
            new Rule(HttpMethod.DELETE, Pattern.compile("/console/contacts/[^/]+/pending")));

    @Inject
    ConsoleContext context;

    @Override
    public void filter(ContainerRequestContext request) {
        String path = request.getUriInfo().getPath();
        if (!path.startsWith("/console/")) {
            return;
        }
        boolean restricted = MANAGERS_ONLY.stream()
                .anyMatch(rule -> rule.method().equals(request.getMethod())
                        && rule.path().matcher(path).matches());
        if (restricted && context.organizationRoles().stream().noneMatch(MANAGERS::contains)) {
            request.abortWith(ProblemDetail.response(
                    403, "organization_role_forbidden", "Only the organization's owners and admins can do this"));
        }
    }
}
