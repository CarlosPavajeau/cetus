package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.billing.BillingViews.CreatePlanRequest;
import com.cantte.cetus.api.billing.BillingViews.CreatePriceRequest;
import com.cantte.cetus.api.billing.BillingViews.PlanOfferView;
import com.cantte.cetus.api.billing.BillingViews.PlanPriceView;
import com.cantte.cetus.api.billing.PlanCatalog;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.usage.UsageViews.PlanView;
import com.cantte.cetus.persistence.entity.PlanEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * The plans an admin can assign to an account, and the catalog Cetus sells. Partner contracts and subscriptions
 * are added by hand; an admin puts packages and top-ups on sale and gives any plan a new price version.
 */
@Path("/admin/plans")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminPlanResource {

    @Inject
    PlanCatalog catalog;

    @Inject
    ConsoleContext context;

    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public List<PlanView> list() {
        return PlanEntity.<PlanEntity>listAssignable().stream()
                .map(PlanView::from)
                .toList();
    }

    @POST
    @Transactional
    @Consumes(MediaType.APPLICATION_JSON)
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "422",
            description = "Unprocessable Entity",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public PlanOfferView create(@Valid @NotNull CreatePlanRequest request) {
        return catalog.create(request, context.platformActor(), origin.resolve());
    }

    @GET
    @Path("/{code}/prices")
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "404",
            description = "Not Found",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public List<PlanPriceView> prices(@PathParam("code") String code) {
        return catalog.prices(code);
    }

    @POST
    @Path("/{code}/prices")
    @Transactional
    @Consumes(MediaType.APPLICATION_JSON)
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "404",
            description = "Not Found",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "422",
            description = "Unprocessable Entity",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public PlanPriceView addPrice(@PathParam("code") String code, @Valid @NotNull CreatePriceRequest request) {
        return catalog.addPrice(code, request, context.platformActor(), origin.resolve());
    }
}
