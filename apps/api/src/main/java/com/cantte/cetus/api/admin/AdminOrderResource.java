package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.billing.PaymentClients;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.billing.OrderLots;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.PaymentReversalEntity;
import com.cantte.cetus.persistence.entity.PaymentTransactionEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
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
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * An account's orders, for the Cetus team: support reads them; only admins give money back, register a chargeback
 * or forgive a debt, always with a reason. The worker applies each reversal: the API only validates and records it.
 */
@Path("/admin/accounts/{accountId}/orders")
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
        responseCode = "409",
        description = "Conflict",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "422",
        description = "Unprocessable Entity",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminOrderResource {

    private static final int ORDERS_LIMIT = 50;

    @Schema(description = "Money that went back, or is going back, from a paid order")
    public record ReversalView(
            UUID id,
            int number,
            PaymentReversalEntity.Kind kind,
            PaymentReversalEntity.Mode mode,
            String reference,
            long amountCents,
            PaymentReversalEntity.Status status,
            String reason,
            @Schema(nullable = true) String failureMessage,

            @Schema(nullable = true, description = "Unused credits of the order revoked when it was approved")
            Integer creditsRevoked,

            @Schema(nullable = true, description = "What the account used and owes after a chargeback")
            Long debtCents,

            @Schema(nullable = true) UUID debtOrderId,
            @Schema(nullable = true) UUID creditNoteDocumentId,
            @Schema(nullable = true) OffsetDateTime approvedAt,
            OffsetDateTime createdAt) {

        static ReversalView from(PaymentReversalEntity reversal) {
            return new ReversalView(
                    reversal.id,
                    reversal.number,
                    reversal.kind,
                    reversal.mode,
                    reversal.reference,
                    reversal.amountCents,
                    reversal.status,
                    reversal.reason,
                    reversal.failureMessage,
                    reversal.creditsRevoked,
                    reversal.debtCents,
                    reversal.debtOrderId,
                    reversal.creditNoteDocumentId,
                    reversal.approvedAt,
                    reversal.createdAt);
        }
    }

    @Schema(description = "An order of the account with what went back from it")
    public record AdminOrderView(
            UUID id,
            BillingOrderEntity.Kind kind,
            BillingOrderEntity.Status status,
            String reference,
            long totalCents,
            @Schema(nullable = true) OffsetDateTime expiresAt,
            @Schema(nullable = true) OffsetDateTime paidAt,
            OffsetDateTime createdAt,
            @Schema(nullable = true) String reviewReason,

            @Schema(nullable = true, description = "The approved Wompi transaction a refund goes back from")
            String transactionId,

            @Schema(nullable = true) String paymentMethodType,
            @Schema(nullable = true) UUID invoiceDocumentId,

            @Schema(description = "What approved reversals gave back")
            long reversedCents,

            @Schema(description = "What the account used of the order: its share of each lot, overage in full")
            long consumedCents,

            @Schema(description = "What can still go back: paid and not given back yet")
            long refundableCents,

            @Schema(description = "The refund that leaves the account paying only for what it used")
            long refundSuggestedCents,

            List<ReversalView> reversals) {}

    public record RefundRequest(
            @NotNull @Positive Long amountCents,
            @NotNull PaymentReversalEntity.Mode mode,
            @NotBlank @Size(min = 3, max = 500) String reason) {}

    public record ReasonRequest(
            @NotBlank @Size(min = 3, max = 500) String reason) {}

    /** Whether Wompi's dashboard shows the refund approved. */
    public record ResolutionRequest(
            @NotNull Boolean approved,
            @NotBlank @Size(min = 3, max = 500) String reason) {}

    @Inject
    AuditLog auditLog;

    @Inject
    ConsoleContext context;

    @Inject
    RequestOriginResolver origin;

    @Inject
    JobQueue jobs;

    @Inject
    PaymentClients payments;

    @GET
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public List<AdminOrderView> orders(@PathParam("accountId") UUID accountId) {
        AccountEntity account = account(accountId);
        return views(BillingOrderEntity.listByAccount(account.id, ORDERS_LIMIT));
    }

    /**
     * Gives money of a paid order back: asks Wompi for it (WOMPI), or registers one made elsewhere (EXTERNAL). Once
     * approved, the order's unused credits are revoked, whatever the amount.
     */
    @POST
    @Path("/{orderId}/refunds")
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    public AdminOrderView refund(
            @PathParam("accountId") UUID accountId,
            @PathParam("orderId") UUID orderId,
            @Valid @NotNull RefundRequest request) {
        BillingOrderEntity order = lockReversible(accountId, orderId);
        long refundable = order.totalCents - PaymentReversalEntity.approvedCents(order.id);
        if (request.amountCents() > refundable) {
            throw new DomainException(
                    "refund_exceeds_paid", "At most " + refundable + " cents of the order can still go back");
        }
        String transactionId = null;
        if (request.mode() == PaymentReversalEntity.Mode.WOMPI) {
            if (payments.gateway().isEmpty()) {
                throw new DomainException("payments_not_configured", "Payments are not available right now");
            }
            transactionId = approvedTransaction(order.id)
                    .map(payment -> payment.providerTransactionId)
                    .orElseThrow(() -> new DomainException(
                            "payment_transaction_missing",
                            "The order has no approved Wompi payment; register a refund made elsewhere"));
        }
        String reason = request.reason().strip();
        Actor actor = context.platformActor();
        PaymentReversalEntity reversal = PaymentReversalEntity.request(
                order,
                PaymentReversalEntity.Kind.REFUND,
                request.mode(),
                request.amountCents(),
                transactionId,
                actor,
                reason);
        jobs.enqueue(
                request.mode() == PaymentReversalEntity.Mode.WOMPI ? JobTypes.REFUND_ORDER : JobTypes.APPLY_REVERSAL,
                reversal.id);
        auditLog.record(
                order.accountId,
                actor,
                origin.resolve(),
                AuditAction.BILLING_ORDER_REFUND_REQUESTED,
                "billing_order",
                order.id,
                Map.of(
                        "reference",
                        reversal.reference,
                        "amountCents",
                        reversal.amountCents,
                        "mode",
                        reversal.mode.name(),
                        "reason",
                        reason));
        return views(List.of(order)).getFirst();
    }

    /**
     * Registers that the bank took the order's payment back, as Wompi reports it outside its API: what had not gone
     * back yet is reversed, the unused credits are revoked and what was used becomes a debt.
     */
    @POST
    @Path("/{orderId}/chargeback")
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    public AdminOrderView chargeBack(
            @PathParam("accountId") UUID accountId,
            @PathParam("orderId") UUID orderId,
            @Valid @NotNull ReasonRequest request) {
        BillingOrderEntity order = lockReversible(accountId, orderId);
        long left = order.totalCents - PaymentReversalEntity.approvedCents(order.id);
        PaymentReversalEntity reversal = PaymentReversalEntity.request(
                order,
                PaymentReversalEntity.Kind.CHARGEBACK,
                PaymentReversalEntity.Mode.EXTERNAL,
                left,
                approvedTransaction(order.id)
                        .map(payment -> payment.providerTransactionId)
                        .orElse(null),
                context.platformActor(),
                request.reason().strip());
        jobs.enqueue(JobTypes.APPLY_REVERSAL, reversal.id);
        return views(List.of(order)).getFirst();
    }

    /**
     * Settles a Wompi refund that never got an answer, as a person found it in Wompi's dashboard: approved, it is
     * applied like any other; otherwise it failed and the order can give money back again.
     */
    @POST
    @Path("/{orderId}/reversals/{reversalId}/resolution")
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    public AdminOrderView resolve(
            @PathParam("accountId") UUID accountId,
            @PathParam("orderId") UUID orderId,
            @PathParam("reversalId") UUID reversalId,
            @Valid @NotNull ResolutionRequest request) {
        BillingOrderEntity order = lock(accountId, orderId);
        PaymentReversalEntity reversal = PaymentReversalEntity.lock(reversalId)
                .filter(found -> found.orderId.equals(order.id))
                .orElseThrow(() -> new NotFoundException("Reversal not found"));
        if (reversal.status != PaymentReversalEntity.Status.SUBMITTED) {
            throw new DomainException("reversal_not_unresolved", "Only a refund Wompi has not answered is resolved");
        }
        String reason = request.reason().strip();
        if (request.approved()) {
            jobs.enqueue(JobTypes.APPLY_REVERSAL, reversal.id);
        } else {
            reversal.status = PaymentReversalEntity.Status.FAILED;
            reversal.failureMessage = reason;
        }
        auditLog.record(
                order.accountId,
                context.platformActor(),
                origin.resolve(),
                AuditAction.BILLING_ORDER_REFUND_RESOLVED,
                "billing_order",
                order.id,
                Map.of("reference", reversal.reference, "approved", request.approved(), "reason", reason));
        return views(List.of(order)).getFirst();
    }

    /** Forgives a debt: the account may buy again and the order is never charged. */
    @POST
    @Path("/{orderId}/waiver")
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    public AdminOrderView waive(
            @PathParam("accountId") UUID accountId,
            @PathParam("orderId") UUID orderId,
            @Valid @NotNull ReasonRequest request) {
        BillingOrderEntity order = lock(accountId, orderId);
        if (order.kind != BillingOrderEntity.Kind.DEBT || order.status != BillingOrderEntity.Status.PENDING) {
            throw new DomainException("order_not_debt", "Only a pending debt can be forgiven");
        }
        order.status = BillingOrderEntity.Status.CANCELED;
        String reason = request.reason().strip();
        auditLog.record(
                order.accountId,
                context.platformActor(),
                origin.resolve(),
                AuditAction.BILLING_ORDER_DEBT_WAIVED,
                "billing_order",
                order.id,
                Map.of("reference", order.reference, "totalCents", order.totalCents, "reason", reason));
        return views(List.of(order)).getFirst();
    }

    /** The order, locked, if money can go back from it: paid, some of it not given back, nothing going back now. */
    private static BillingOrderEntity lockReversible(UUID accountId, UUID orderId) {
        BillingOrderEntity order = lock(accountId, orderId);
        if (order.status != BillingOrderEntity.Status.PAID) {
            throw new DomainException("order_not_paid", "Only a paid order can give money back");
        }
        if (PaymentReversalEntity.findLive(order.id).isPresent()) {
            throw new ReversalInProgress();
        }
        return order;
    }

    private static BillingOrderEntity lock(UUID accountId, UUID orderId) {
        AccountEntity account = account(accountId);
        BillingOrderEntity.findForAccount(orderId, account.id)
                .orElseThrow(() -> new NotFoundException("Order not found"));
        return BillingOrderEntity.lock(orderId).orElseThrow();
    }

    private static Optional<PaymentTransactionEntity> approvedTransaction(UUID orderId) {
        return PaymentTransactionEntity.listByOrder(orderId).stream()
                .filter(payment -> payment.status == PaymentTransactionEntity.Status.APPROVED)
                .findFirst();
    }

    private static List<AdminOrderView> views(List<BillingOrderEntity> orders) {
        List<UUID> ids = orders.stream().map(order -> order.id).toList();
        Map<UUID, List<PaymentReversalEntity>> reversals = PaymentReversalEntity.listByOrders(ids).stream()
                .collect(Collectors.groupingBy(reversal -> reversal.orderId));
        Map<UUID, PaymentTransactionEntity> approved = approvedTransactions(ids);
        return orders.stream()
                .map(order -> {
                    List<PaymentReversalEntity> own = reversals.getOrDefault(order.id, List.of());
                    long reversed = own.stream()
                            .filter(reversal -> reversal.status == PaymentReversalEntity.Status.APPROVED)
                            .mapToLong(reversal -> reversal.amountCents)
                            .sum();
                    boolean paid = order.paidAt != null;
                    long consumed = paid ? OrderLots.consumedCents(order.id) : 0;
                    long refundable = paid ? order.totalCents - reversed : 0;
                    Optional<PaymentTransactionEntity> payment = Optional.ofNullable(approved.get(order.id));
                    return new AdminOrderView(
                            order.id,
                            order.kind,
                            order.status,
                            order.reference,
                            order.totalCents,
                            order.expiresAt,
                            order.paidAt,
                            order.createdAt,
                            order.reviewReason,
                            payment.map(p -> p.providerTransactionId).orElse(null),
                            payment.map(p -> p.paymentMethodType).orElse(null),
                            order.invoiceDocumentId,
                            reversed,
                            consumed,
                            refundable,
                            Math.max(0, Math.min(refundable, order.totalCents - consumed - reversed)),
                            own.stream().map(ReversalView::from).toList());
                })
                .toList();
    }

    private static Map<UUID, PaymentTransactionEntity> approvedTransactions(Collection<UUID> orderIds) {
        if (orderIds.isEmpty()) {
            return Map.of();
        }
        return PaymentTransactionEntity.<PaymentTransactionEntity>list(
                        "orderId in ?1 and status = ?2 order by providerCreatedAt",
                        orderIds,
                        PaymentTransactionEntity.Status.APPROVED)
                .stream()
                .collect(Collectors.toMap(payment -> payment.orderId, Function.identity(), (first, second) -> first));
    }

    private static AccountEntity account(UUID id) {
        return AccountEntity.<AccountEntity>findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Account not found"));
    }

    /** A reversal of the order waits to be sent or answered; it must end first. */
    public static class ReversalInProgress extends WebApplicationException {

        ReversalInProgress() {
            super(ProblemDetail.response(
                    409, "reversal_in_progress", "Money of this order is already going back; wait for it to end"));
        }
    }
}
