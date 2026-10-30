package com.cantte.cetus.api.console;

import com.cantte.cetus.api.billing.BillingViews.PlanOfferView;
import com.cantte.cetus.api.billing.PlanCatalog;
import com.cantte.cetus.api.error.ProblemDetail;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** The plans on sale and the price each has now. */
@Path("/console/plans")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class PlanOfferResource {

    @Inject
    PlanCatalog catalog;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public List<PlanOfferView> list() {
        return catalog.offers();
    }
}
