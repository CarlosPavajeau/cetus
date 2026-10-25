package com.cantte.cetus.api.console;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.usage.AccountUsage;
import com.cantte.cetus.api.usage.UsageViews.UsageView;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** The account's plan and what it used of it, for every member. */
@Path("/console/usage")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class UsageResource {

    static final int MONTHS = 6;

    @Inject
    ConsoleContext context;

    @Inject
    AccountUsage usage;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public UsageView get() {
        return usage.overview(context.account(), MONTHS);
    }
}
