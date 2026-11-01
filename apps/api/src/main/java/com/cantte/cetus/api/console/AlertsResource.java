package com.cantte.cetus.api.console;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.metrics.ConsoleMetrics;
import com.cantte.cetus.api.metrics.MetricsViews.AlertsView;
import com.cantte.cetus.domain.model.Environment;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** The certificates and numbering ranges of an environment's issuers, for every member. */
@Path("/console/alerts")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AlertsResource {

    @Inject
    ConsoleContext context;

    @Inject
    ConsoleMetrics metrics;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public AlertsView get(@QueryParam("environment") @NotNull Environment environment) {
        return metrics.alerts(context.accountId(), environment);
    }
}
