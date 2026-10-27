package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.admin.AdminViews.AccountDetailView;
import com.cantte.cetus.api.admin.AdminViews.AccountPage;
import com.cantte.cetus.api.admin.AdminViews.AccountSummaryView;
import com.cantte.cetus.api.admin.AdminViews.PlanChangeRequest;
import com.cantte.cetus.api.admin.AdminViews.StatusChangeRequest;
import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.console.IssuerViews;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.usage.AccountUsage;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.usage.UsagePeriod;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.notifications.Notifications;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * Every Cetus account, for the Cetus team. Support reads; only admins suspend, reactivate and change plans. A suspended
 * account cannot use its API keys and its console is read-only; documents already queued still finish,
 * since they hold their number.
 */
@Path("/admin/accounts")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "400",
        description = "Bad Request",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "404",
        description = "Not Found",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "422",
        description = "Unprocessable Entity",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminAccountResource {

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

    @Inject
    Notifications notifications;

    @Inject
    AccountUsage usage;

    @GET
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public AccountPage list(
            @QueryParam("status") String statusName,
            @QueryParam("organizationId") List<String> organizationIds,
            @QueryParam("before") UUID before,
            @QueryParam("limit") @DefaultValue("50") int limit) {
        AccountEntity.Status status = statusName == null
                ? null
                : Arrays.stream(AccountEntity.Status.values())
                        .filter(each -> each.name().equals(statusName))
                        .findFirst()
                        .orElseThrow(() -> new BadRequestException("Unknown status " + statusName));
        if (organizationIds != null && organizationIds.size() > MAX_ORGANIZATION_IDS) {
            throw new BadRequestException("At most " + MAX_ORGANIZATION_IDS + " organization ids");
        }
        int size = Math.clamp(limit, 1, AdminAccountQueries.MAX_PAGE_SIZE);
        // One extra row tells whether there is a next page.
        List<AccountSummaryView> rows = queries.list(status, organizationIds, before, size + 1);
        List<AccountSummaryView> items = rows.subList(0, Math.min(rows.size(), size));
        UUID nextCursor = rows.size() > size ? items.getLast().id() : null;
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
        AccountEntity account = lockedAccount(id);
        if (account.status != AccountEntity.Status.ACTIVE) {
            throw new DomainException("account_not_active", "Only an active account can be suspended");
        }
        changeStatus(account, AccountEntity.Status.SUSPENDED, request.reason(), AuditAction.ACCOUNT_SUSPENDED);
        // The billing contact hears it from Cetus, with the same reason the console banner shows.
        notifications.request(
                account.id,
                NotificationKind.ACCOUNT_SUSPENDED,
                "account_suspended:%s:%d"
                        .formatted(
                                account.id, account.statusChangedAt.toInstant().toEpochMilli()),
                Map.of("reason", account.statusReason));
        return detail(account);
    }

    @POST
    @Path("/{id}/reactivation")
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    public AccountDetailView reactivate(@PathParam("id") UUID id, @Valid @NotNull StatusChangeRequest request) {
        AccountEntity account = lockedAccount(id);
        if (account.status != AccountEntity.Status.SUSPENDED) {
            throw new DomainException("account_not_suspended", "Only a suspended account can be reactivated");
        }
        changeStatus(account, AccountEntity.Status.ACTIVE, request.reason(), AuditAction.ACCOUNT_REACTIVATED);
        return detail(account);
    }

    @PUT
    @Path("/{id}/plan")
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    public AccountDetailView changePlan(@PathParam("id") UUID id, @Valid @NotNull PlanChangeRequest request) {
        AccountEntity account = lockedAccount(id);
        PlanEntity plan = PlanEntity.findById(request.plan());
        if (plan == null || !plan.assignable) {
            throw new DomainException("plan_unknown", "There is no assignable plan " + request.plan());
        }
        if (plan.code.equals(account.plan)) {
            throw new DomainException("plan_unchanged", "The account already has the plan " + plan.code);
        }
        String previous = account.plan;
        account.plan = plan.code;
        auditLog.record(
                account.id,
                context.platformActor(),
                origin.resolve(),
                AuditAction.ACCOUNT_PLAN_CHANGED,
                "account",
                account.id,
                Map.of(
                        "plan",
                        plan.code,
                        "planPrevious",
                        previous,
                        "reason",
                        request.reason().strip()));
        return detail(account);
    }

    private void changeStatus(AccountEntity account, AccountEntity.Status status, String reason, AuditAction action) {
        AccountEntity.Status previous = account.status;
        String why = reason.strip();
        account.status = status;
        account.statusReason = why;
        account.statusChangedAt = OffsetDateTime.now();
        account.statusChangedBy = context.userId();
        auditLog.record(
                account.id,
                context.platformActor(),
                origin.resolve(),
                action,
                "account",
                account.id,
                Map.of("reason", why, "previousStatus", previous.name()));
    }

    private AccountDetailView detail(AccountEntity account) {
        List<IssuerViews.IssuerView> issuers = IssuerEntity.listByAccount(account.id).stream()
                .map(IssuerViews.IssuerView::from)
                .toList();
        return AccountDetailView.of(
                account,
                issuers,
                queries.usageThisMonth(account.id),
                usage.period(account, UsagePeriod.current()),
                queries.recentFailures(account.id));
    }

    /**
     * The account, locked until the transaction ends. Every change of an account saves the whole row, so a
     * plan change and a suspension running together would otherwise put back each other's fields.
     */
    private static AccountEntity lockedAccount(UUID id) {
        AccountEntity account = AccountEntity.findById(id, LockModeType.PESSIMISTIC_WRITE);
        if (account == null) {
            throw new NotFoundException("Account not found");
        }
        return account;
    }

    private static AccountEntity account(UUID id) {
        AccountEntity account = AccountEntity.findById(id);
        if (account == null) {
            throw new NotFoundException("Account not found");
        }
        return account;
    }
}
