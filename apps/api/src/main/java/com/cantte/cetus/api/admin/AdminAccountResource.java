package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.admin.AdminViews.AccountDetailView;
import com.cantte.cetus.api.admin.AdminViews.AccountPage;
import com.cantte.cetus.api.admin.AdminViews.AccountSummaryView;
import com.cantte.cetus.api.admin.AdminViews.StatusChangeRequest;
import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.console.IssuerViews;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Every Cetus account, for the Cetus team. Support reads; only admins suspend and reactivate. A suspended
 * account cannot use its API keys and its console is read-only; documents already queued still finish,
 * since they hold their number.
 */
@Path("/admin/accounts")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(responseCode = "400", description = "Bad Request",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(responseCode = "403", description = "Forbidden",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(responseCode = "404", description = "Not Found",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(responseCode = "422", description = "Unprocessable Entity",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminAccountResource {

    private static final Set<String> STATUSES = Set.of("ACTIVE", "SUSPENDED", "CLOSED");
    /** Bounds the IN list the console sends after searching organizations by name. */
    private static final int MAX_ORGANIZATION_IDS = 100;

    @Inject
    ConsoleContext context;
    @Inject
    AdminAccountQueries queries;
    @Inject
    AuditLog auditLog;
    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public AccountPage list(@QueryParam("status") String status,
                            @QueryParam("organizationId") List<String> organizationIds,
                            @QueryParam("before") UUID before,
                            @QueryParam("limit") @DefaultValue("50") int limit) {
        if (status != null && !STATUSES.contains(status)) {
            throw new BadRequestException("Unknown status " + status);
        }
        if (organizationIds != null && organizationIds.size() > MAX_ORGANIZATION_IDS) {
            throw new BadRequestException("At most " + MAX_ORGANIZATION_IDS + " organization ids");
        }
        int size = Math.max(1, Math.min(limit, AdminAccountQueries.MAX_PAGE_SIZE));
        // One extra row tells whether there is a next page.
        List<AccountSummaryView> rows = queries.list(status, organizationIds, before, size + 1);
        List<AccountSummaryView> items = rows.subList(0, Math.min(rows.size(), size));
        UUID nextCursor = rows.size() > size ? items.get(items.size() - 1).id() : null;
        return new AccountPage(items, nextCursor);
    }

    @GET
    @Path("/{id}")
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public AccountDetailView get(@PathParam("id") UUID id) {
        return detail(account(id));
    }

    @POST
    @Path("/{id}/suspension")
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    public AccountDetailView suspend(@PathParam("id") UUID id, @Valid @NotNull StatusChangeRequest request) {
        AccountEntity account = account(id);
        if (!"ACTIVE".equals(account.status)) {
            throw new DomainException("account_not_active", "Only an active account can be suspended");
        }
        changeStatus(account, "SUSPENDED", request.reason(), AuditAction.ACCOUNT_SUSPENDED);
        return detail(account);
    }

    @POST
    @Path("/{id}/reactivation")
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    public AccountDetailView reactivate(@PathParam("id") UUID id, @Valid @NotNull StatusChangeRequest request) {
        AccountEntity account = account(id);
        if (!"SUSPENDED".equals(account.status)) {
            throw new DomainException("account_not_suspended", "Only a suspended account can be reactivated");
        }
        changeStatus(account, "ACTIVE", request.reason(), AuditAction.ACCOUNT_REACTIVATED);
        return detail(account);
    }

    private void changeStatus(AccountEntity account, String status, String reason, AuditAction action) {
        String previous = account.status;
        String why = reason.strip();
        account.status = status;
        account.statusReason = why;
        account.statusChangedAt = OffsetDateTime.now();
        account.statusChangedBy = context.userId();
        auditLog.record(account.id, context.platformActor(), origin.resolve(), action, "account", account.id,
                Map.of("reason", why, "previousStatus", previous));
    }

    private AccountDetailView detail(AccountEntity account) {
        List<IssuerViews.IssuerView> issuers = IssuerEntity.listByAccount(account.id).stream()
                .map(IssuerViews.IssuerView::from).toList();
        return AccountDetailView.of(account, issuers, queries.usageThisMonth(account.id),
                queries.recentFailures(account.id));
    }

    private static AccountEntity account(UUID id) {
        AccountEntity account = AccountEntity.findById(id);
        if (account == null) {
            throw new NotFoundException("Account not found");
        }
        return account;
    }
}
