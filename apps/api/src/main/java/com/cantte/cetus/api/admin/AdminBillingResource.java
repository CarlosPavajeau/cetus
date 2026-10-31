package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.billing.BillingViews.RevenueView;
import com.cantte.cetus.api.billing.Revenue;
import com.cantte.cetus.api.error.ProblemDetail;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.time.LocalDate;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** Cetus' own income from the accounts' purchases, against the VAT threshold of its holder. */
@Path("/admin/billing")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminBillingResource {

    @Inject
    Revenue revenue;

    /** The calendar year's income; the current year (Colombia time) when {@code year} is left out. */
    @GET
    @Path("/revenue")
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public RevenueView revenue(@QueryParam("year") @Min(2025) @Max(2100) Integer year) {
        return revenue.year(year == null ? LocalDate.now(Revenue.COLOMBIA).getYear() : year);
    }
}
