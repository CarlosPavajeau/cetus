package com.cantte.cetus.api.console;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.persistence.entity.AccountEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.HttpMethod;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;
import java.util.Set;
import org.eclipse.microprofile.jwt.JsonWebToken;

/**
 * A suspended (or closed) account keeps reading its console: documents, files and activity. Every change
 * answers 403 {@code account_suspended}, the same code its API keys get from {@code ApiKeyFilter}. One filter
 * instead of a check per resource, so a new endpoint cannot forget it.
 */
@Provider
@Priority(Priorities.AUTHORIZATION)
public class SuspendedAccountFilter implements ContainerRequestFilter {

    private static final Set<String> READS = Set.of(HttpMethod.GET, HttpMethod.HEAD, HttpMethod.OPTIONS);
    /**
     * Bootstrapping is idempotent (it returns the existing account, whatever its status), ending an
     * impersonation only records it, and a document preview stores nothing.
     */
    private static final Set<String> ALLOWED =
            Set.of("/console/account", "/console/impersonation/end", "/console/documents/preview");

    @Inject
    JsonWebToken jwt;

    @Override
    public void filter(ContainerRequestContext request) {
        String path = request.getUriInfo().getPath();
        if (!path.startsWith("/console/") || READS.contains(request.getMethod()) || ALLOWED.contains(path)) {
            return;
        }
        String organizationId = jwt.getClaim("org");
        if (organizationId == null || organizationId.isBlank()) {
            return;
        }
        AccountEntity.Status status = QuarkusTransaction.requiringNew()
                .call(() -> AccountEntity.findByOrganization(organizationId)
                        .map(account -> account.status)
                        .orElse(null));
        if (status != null && status != AccountEntity.Status.ACTIVE) {
            request.abortWith(ProblemDetail.response(403, "account_suspended", "This account is suspended"));
        }
    }
}
