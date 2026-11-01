package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.billing.BillingViews.RevenueView;
import com.cantte.cetus.api.billing.Reconciliation;
import com.cantte.cetus.api.billing.Reconciliation.ReconciliationView;
import com.cantte.cetus.api.billing.Revenue;
import com.cantte.cetus.api.error.ProblemDetail;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.time.LocalDate;
import java.time.YearMonth;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * Cetus' own income from the accounts' purchases, against the VAT threshold of its holder, and each month's sales
 * crossed with Wompi and the invoices.
 */
@Path("/admin/billing")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminBillingResource {

    private static final String MONTH = "^20[0-9]{2}-(0[1-9]|1[0-2])$";

    @Inject
    Revenue revenue;

    @Inject
    Reconciliation reconciliation;

    /** The calendar year's income; the current year (Colombia time) when {@code year} is left out. */
    @GET
    @Path("/revenue")
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public RevenueView revenue(@QueryParam("year") @Min(2025) @Max(2100) Integer year) {
        return revenue.year(year == null ? LocalDate.now(Revenue.COLOMBIA).getYear() : year);
    }

    /** The month's orders, Wompi transactions, invoices and credit notes, with what does not add up. */
    @GET
    @Path("/reconciliation")
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public ReconciliationView reconciliation(@QueryParam("month") @NotNull @Pattern(regexp = MONTH) String month) {
        return reconciliation.month(YearMonth.parse(month));
    }

    /** Asks Wompi again for the payments of the month's orders; the report shows its answers once they arrive. */
    @POST
    @Path("/reconciliation/checks")
    @Transactional
    @RolesAllowed(PlatformRoles.ADMIN)
    @APIResponse(responseCode = "200", description = "OK")
    public ChecksView refresh(@QueryParam("month") @NotNull @Pattern(regexp = MONTH) String month) {
        return new ChecksView(reconciliation.refresh(YearMonth.parse(month)).size());
    }

    @Schema(description = "Orders whose payments are asked to Wompi again")
    public record ChecksView(int ordersChecked) {}
}
