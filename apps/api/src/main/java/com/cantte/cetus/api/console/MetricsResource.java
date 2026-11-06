package com.cantte.cetus.api.console;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.metrics.ConsoleMetrics;
import com.cantte.cetus.api.metrics.MetricsViews.IssuerMetricsView;
import com.cantte.cetus.api.metrics.MetricsViews.MetricsView;
import com.cantte.cetus.domain.model.Environment;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** How an environment's documents of a period went, for every member. */
@Path("/console/metrics")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class MetricsResource {

    @Inject
    ConsoleContext context;

    @Inject
    ConsoleMetrics metrics;

    /** {@code from} and {@code to} bound the issue date, both included; {@code issuerId} narrows to one issuer. */
    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "400",
            description = "Invalid period",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public MetricsView get(
            @QueryParam("environment") @NotNull Environment environment,
            @QueryParam("issuerId") UUID issuerId,
            @QueryParam("from") @NotNull LocalDate from,
            @QueryParam("to") @NotNull LocalDate to) {
        checkPeriod(from, to);
        return metrics.metrics(context.accountId(), environment, issuerId, from, to);
    }

    /** Each issuer's documents of the period and its certificate, so several companies are never added up. */
    @GET
    @Path("issuers")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "400",
            description = "Invalid period",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public List<IssuerMetricsView> byIssuer(
            @QueryParam("environment") @NotNull Environment environment,
            @QueryParam("from") @NotNull LocalDate from,
            @QueryParam("to") @NotNull LocalDate to) {
        checkPeriod(from, to);
        return metrics.byIssuer(context.accountId(), environment, from, to);
    }

    private static void checkPeriod(LocalDate from, LocalDate to) {
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) >= ConsoleMetrics.PERIOD_DAYS_MAX) {
            throw new InvalidPeriod();
        }
    }

    public static class InvalidPeriod extends WebApplicationException {

        InvalidPeriod() {
            super(ProblemDetail.response(
                    400,
                    "invalid_period",
                    "The period must end on or after its start and span at most " + ConsoleMetrics.PERIOD_DAYS_MAX
                            + " days"));
        }
    }
}
