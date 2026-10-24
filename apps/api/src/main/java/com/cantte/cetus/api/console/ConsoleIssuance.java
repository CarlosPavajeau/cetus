package com.cantte.cetus.api.console;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.model.Environment;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import java.util.Set;

/**
 * Who may issue documents from the console. In SANDBOX and TEST any member can; a LIVE document is a real
 * fiscal document, only corrected with another one, so it takes an owner, an admin or a biller, and never a
 * Cetus admin impersonating them. The environment comes from the issuer or the invoice, not the path, so the rule lives
 * here rather than in {@link OrganizationRoleFilter} or {@link ImpersonationFilter}.
 */
@ApplicationScoped
public class ConsoleIssuance {

    static final Set<String> LIVE_ISSUERS = Set.of("owner", "admin", "biller");

    @Inject
    ConsoleContext context;

    public void requireCanIssue(Environment environment) {
        if (environment != Environment.LIVE) {
            return;
        }
        if (context.impersonatedBy().isPresent()) {
            throw new IssuanceForbidden(
                    "impersonation_forbidden", "LIVE documents cannot be issued while impersonating a user");
        }
        if (context.organizationRoles().stream().noneMatch(LIVE_ISSUERS::contains)) {
            throw new IssuanceForbidden(
                    "organization_role_forbidden",
                    "Only the organization's owners, admins and billers can issue LIVE documents");
        }
    }

    public static class IssuanceForbidden extends WebApplicationException {

        IssuanceForbidden(String code, String message) {
            super(ProblemDetail.response(403, code, message));
        }
    }
}
