package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.CreditMovementEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * An account's credits, for the Cetus team: support reads them; only admins grant lots and adjust balances, always
 * with a reason.
 */
@Path("/admin/accounts/{accountId}/credits")
@Produces(MediaType.APPLICATION_JSON)
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
public class AdminCreditResource {

    private static final int MOVEMENTS_LIMIT = 100;

    public record GrantView(
            UUID id,
            @Schema(nullable = true) UUID planVersionId,
            CreditGrantEntity.SourceType sourceType,
            int quantity,
            int remaining,
            OffsetDateTime expiresAt,
            CreditGrantEntity.Status status,
            OffsetDateTime createdAt) {

        static GrantView from(CreditGrantEntity lot) {
            return new GrantView(
                    lot.id,
                    lot.planVersionId,
                    lot.sourceType,
                    lot.quantity,
                    lot.remaining,
                    lot.expiresAt,
                    lot.status,
                    lot.createdAt);
        }
    }

    public record MovementView(
            UUID id,
            @Schema(nullable = true) UUID grantId,
            @Schema(nullable = true) UUID documentId,
            CreditMovementEntity.Type type,
            int quantity,
            String actorType,
            @Schema(nullable = true) String actorId,
            @Schema(nullable = true) String reason,
            OffsetDateTime createdAt) {

        static MovementView from(CreditMovementEntity movement) {
            return new MovementView(
                    movement.id,
                    movement.grantId,
                    movement.documentId,
                    movement.type,
                    movement.quantity,
                    movement.actorType,
                    movement.actorId,
                    movement.reason,
                    movement.createdAt);
        }
    }

    /**
     * @param available credits left in lots that have not expired
     * @param graceUsed grace documents not yet paid by a lot, credit notes aside
     * @param movements the latest, newest first
     */
    public record CreditsView(
            boolean product,
            int issuersIncluded,
            int available,
            int graceUsed,
            int graceMargin,
            List<GrantView> grants,
            List<MovementView> movements) {}

    /** A lot of the plan version, such as a courtesy package, that counts as that product until it expires. */
    public record GrantRequest(
            @NotNull UUID planVersionId,
            @NotNull @Positive Integer quantity,
            @NotNull @Future OffsetDateTime expiresAt,
            @NotBlank @Size(min = 3, max = 500) String reason) {}

    /** A positive quantity adds a lot without product until expiresAt; a negative one takes credits. */
    public record AdjustmentRequest(
            @NotNull Integer quantity,
            @Future OffsetDateTime expiresAt,
            @NotBlank @Size(min = 3, max = 500) String reason) {}

    public record ReleaseRequest(
            @NotBlank @Size(min = 3, max = 500) String reason) {}

    @Inject
    CreditLedger ledger;

    @Inject
    AuditLog auditLog;

    @Inject
    ConsoleContext context;

    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public CreditsView credits(@PathParam("accountId") UUID id) {
        return view(account(id).id);
    }

    @POST
    @Path("/grants")
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    public CreditsView grant(@PathParam("accountId") UUID id, @Valid @NotNull GrantRequest request) {
        AccountEntity account = account(id);
        PlanVersionEntity version = PlanVersionEntity.<PlanVersionEntity>findByIdOptional(request.planVersionId())
                .filter(found -> found.accountId == null || found.accountId.equals(account.id))
                .orElseThrow(() -> new DomainException("plan_version_unknown", "There is no such version"));
        PlanEntity plan = PlanEntity.findById(version.planId);
        if (plan.kind == PlanEntity.Kind.SUBSCRIPTION) {
            throw new DomainException("plan_not_grantable", "A subscription is not granted as a lot");
        }
        String reason = request.reason().strip();
        CreditGrantEntity lot = ledger.grant(
                        account.id,
                        new CreditLedger.Source(CreditGrantEntity.SourceType.PROMO, Ids.newId()),
                        version.id,
                        request.quantity(),
                        request.expiresAt(),
                        context.platformActor(),
                        reason)
                .orElseThrow();
        auditLog.record(
                account.id,
                context.platformActor(),
                origin.resolve(),
                AuditAction.CREDITS_GRANTED,
                "credit_grant",
                lot.id,
                Map.of(
                        "plan",
                        plan.code,
                        "quantity",
                        lot.quantity,
                        "expiresAt",
                        lot.expiresAt.toString(),
                        "reason",
                        reason));
        return view(account.id);
    }

    @POST
    @Path("/adjustments")
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    public CreditsView adjust(@PathParam("accountId") UUID id, @Valid @NotNull AdjustmentRequest request) {
        AccountEntity account = account(id);
        int quantity = request.quantity();
        if (quantity == 0) {
            throw new DomainException("adjustment_empty", "An adjustment adds or takes at least one credit");
        }
        if (quantity > 0 && request.expiresAt() == null) {
            throw new DomainException("adjustment_expiry_required", "Credits added need the date they expire");
        }
        String reason = request.reason().strip();
        try {
            ledger.adjust(
                    account.id, quantity, request.expiresAt(), context.platformActor(), reason, OffsetDateTime.now());
        } catch (IllegalArgumentException e) {
            throw new DomainException("adjustment_exceeds_balance", "The account has fewer credits than that");
        }
        auditLog.record(
                account.id,
                context.platformActor(),
                origin.resolve(),
                AuditAction.CREDITS_ADJUSTED,
                "account",
                account.id,
                Map.of("quantity", quantity, "reason", reason));
        return view(account.id);
    }

    CreditsView view(UUID accountId) {
        CreditLedger.Balance balance = ledger.balance(accountId, OffsetDateTime.now());
        return new CreditsView(
                balance.entitlement().product(),
                balance.entitlement().issuersIncluded(),
                balance.available(),
                balance.graceUsed(),
                balance.entitlement().graceMargin(),
                CreditGrantEntity.listByAccount(accountId).stream()
                        .map(GrantView::from)
                        .toList(),
                CreditMovementEntity.listByAccount(accountId, MOVEMENTS_LIMIT).stream()
                        .map(MovementView::from)
                        .toList());
    }

    private static AccountEntity account(UUID id) {
        return AccountEntity.<AccountEntity>findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Account not found"));
    }
}
