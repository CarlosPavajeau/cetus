package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.usage.UsageViews.PlanView;
import com.cantte.cetus.persistence.entity.PlanEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** The plans an admin can assign to an account. Partner contracts are added to them by hand. */
@Path("/admin/plans")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminPlanResource {

    @GET
    @Transactional
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    @APIResponse(responseCode = "200", description = "OK")
    public List<PlanView> list() {
        return PlanEntity.<PlanEntity>listAssignable().stream()
                .map(PlanView::from)
                .toList();
    }
}
