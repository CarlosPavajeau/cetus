package com.cantte.cetus.api.status;

import com.cantte.cetus.api.status.StatusViews.PlatformStatusView;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * Public and outside /v1, for the docs' status page and the console's incident banner: it needs no API key and
 * is not part of the published API.
 */
@Path("/status")
@APIResponse(responseCode = "500", ref = "InternalError")
@Produces(MediaType.APPLICATION_JSON)
public class StatusResource {

    @Inject
    PlatformStatus platformStatus;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public PlatformStatusView status() {
        return platformStatus.current();
    }
}
