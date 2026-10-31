package com.cantte.cetus.api.console;

import com.cantte.cetus.api.billing.AccountCredits;
import com.cantte.cetus.api.billing.BillingViews.AccountCreditsView;
import com.cantte.cetus.api.error.ProblemDetail;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** The account's credits, for every member. */
@Path("/console/credits")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class CreditResource {

    @Inject
    ConsoleContext context;

    @Inject
    AccountCredits credits;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public AccountCreditsView get() {
        return credits.of(context.accountId());
    }
}
