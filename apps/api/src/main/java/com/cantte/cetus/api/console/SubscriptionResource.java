package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.billing.AccountSubscription;
import com.cantte.cetus.api.billing.BillingViews.OverageLimitRequest;
import com.cantte.cetus.api.billing.BillingViews.PlanNextRequest;
import com.cantte.cetus.api.billing.BillingViews.SubscriptionView;
import com.cantte.cetus.api.error.ProblemDetail;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * The account's subscription. Every member reads it; owners and admins change its overage limit, schedule the plan
 * of the next period or end it with the open one, never while impersonating. It is bought as an order.
 */
@Path("/console/subscription")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "404",
        description = "The account has no subscription",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class SubscriptionResource {

    @Inject
    ConsoleContext context;

    @Inject
    AccountSubscription subscriptions;

    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public SubscriptionView get() {
        return subscriptions.of(context.accountId());
    }

    @PUT
    @Path("/overage-limit")
    @Transactional
    @Consumes(MediaType.APPLICATION_JSON)
    @APIResponse(responseCode = "200", description = "OK")
    public SubscriptionView overageLimit(@Valid @NotNull OverageLimitRequest request) {
        return subscriptions.overageLimit(
                context.accountId(), request.overageLimitCents(), context.actor(), origin.resolve());
    }

    @PUT
    @Path("/plan-next")
    @Transactional
    @Consumes(MediaType.APPLICATION_JSON)
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "422",
            description = "Unprocessable Entity",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public SubscriptionView planNext(@Valid @NotNull PlanNextRequest request) {
        return subscriptions.planNext(context.accountId(), request.planVersionId(), context.actor(), origin.resolve());
    }

    @POST
    @Path("/cancellation")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public SubscriptionView cancel() {
        return subscriptions.cancelAtPeriodEnd(context.accountId(), true, context.actor(), origin.resolve());
    }

    @DELETE
    @Path("/cancellation")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public SubscriptionView resume() {
        return subscriptions.cancelAtPeriodEnd(context.accountId(), false, context.actor(), origin.resolve());
    }
}
