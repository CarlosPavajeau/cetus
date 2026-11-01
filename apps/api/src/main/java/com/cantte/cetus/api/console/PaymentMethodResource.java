package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.billing.AccountPaymentMethod;
import com.cantte.cetus.api.billing.BillingViews.CardSetupView;
import com.cantte.cetus.api.billing.BillingViews.PaymentMethodView;
import com.cantte.cetus.api.billing.BillingViews.SavePaymentMethodRequest;
import com.cantte.cetus.api.error.ProblemDetail;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * The card that pays the account's renewals. Every member sees which card it is; owners and admins save, replace
 * or remove it, never while impersonating. The card itself goes from the browser to Wompi, never here.
 */
@Path("/console/payment-method")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class PaymentMethodResource {

    @Inject
    ConsoleContext context;

    @Inject
    AccountPaymentMethod methods;

    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "404",
            description = "The account has no saved card",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public PaymentMethodView get() {
        return methods.of(context.accountId());
    }

    @GET
    @Path("/setup")
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "503",
            description = "Payments are not configured, or Wompi is not answering",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public CardSetupView setup() {
        return methods.setup();
    }

    @PUT
    @Transactional
    @Consumes(MediaType.APPLICATION_JSON)
    @APIResponse(responseCode = "200", description = "Saved, replacing the card before")
    @APIResponse(
            responseCode = "422",
            description = "Unprocessable Entity",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "503",
            description = "Payments are not configured, or Wompi is not answering",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public PaymentMethodView save(@Valid @NotNull SavePaymentMethodRequest request) {
        return methods.save(context.accountId(), request, context.actor(), origin.resolve());
    }

    @DELETE
    @Transactional
    @APIResponse(responseCode = "204", description = "No longer charged")
    @APIResponse(
            responseCode = "404",
            description = "The account has no saved card",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public void remove() {
        methods.remove(context.accountId(), context.actor(), origin.resolve());
    }
}
