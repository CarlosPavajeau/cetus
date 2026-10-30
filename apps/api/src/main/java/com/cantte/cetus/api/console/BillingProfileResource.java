package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.billing.BillingProfiles;
import com.cantte.cetus.api.billing.BillingViews.BillingProfileView;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.invoices.InvoiceRequest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** Who Cetus invoices for the account's purchases. Every member reads it; owners and admins change it. */
@Path("/console/billing-profile")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class BillingProfileResource {

    @Inject
    ConsoleContext context;

    @Inject
    BillingProfiles profiles;

    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "404",
            description = "The account has no billing profile yet",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public BillingProfileView get() {
        return profiles.get(context.accountId());
    }

    @PUT
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
    public BillingProfileView save(@Valid @NotNull InvoiceRequest.Customer request) {
        return profiles.save(context.accountId(), request, context.actor(), origin.resolve());
    }
}
