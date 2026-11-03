package com.cantte.cetus.api.billing;

import com.cantte.cetus.api.billing.BillingViews.PlanOfferView;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.Cache;

/**
 * Public and outside /v1, for the console's price list before sign-in: it needs no API key and is not part of the
 * published API.
 */
@Path("/public/plans")
@APIResponse(responseCode = "500", ref = "InternalError")
@Produces(MediaType.APPLICATION_JSON)
public class PublicPlanResource {

    @Inject
    PlanCatalog catalog;

    @GET
    @Transactional
    @Cache(maxAge = 300)
    @APIResponse(responseCode = "200", description = "OK")
    public List<PlanOfferView> list() {
        return catalog.publicOffers();
    }
}
