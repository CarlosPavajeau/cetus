package com.cantte.cetus.api.leads;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.leads.LeadViews.CalculatorLeadRequest;
import com.cantte.cetus.api.leads.LeadViews.IntegrationLeadRequest;
import com.cantte.cetus.api.leads.LeadViews.LandingView;
import com.cantte.cetus.api.leads.LeadViews.PartnerLeadRequest;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.dian.InvoicingObligation;
import com.cantte.cetus.persistence.entity.LeadEntity.IntegrationDetails;
import com.cantte.cetus.persistence.entity.LeadEntity.Kind;
import com.cantte.cetus.persistence.entity.LeadEntity.PartnerDetails;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * The console's public pages: the landing's figures and the forms that leave an email. No session; like all of
 * /console/** they only answer the console server, which forwards the visitor's IP for the quotas.
 */
@Path("/console/public")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "400",
        description = "Bad Request",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "422",
        description = "Unprocessable Entity",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "429",
        description = "Too Many Requests",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class PublicLeadResource {

    @Inject
    Leads leads;

    @Inject
    LandingFigures figures;

    @GET
    @Path("/landing")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public LandingView landing() {
        return figures.current();
    }

    /** The calculator's answers; the worker emails the person the result they saw. */
    @POST
    @Path("/leads/calculator")
    @Transactional
    @APIResponse(responseCode = "204", description = "No Content")
    public Response calculator(@Valid @NotNull CalculatorLeadRequest request) {
        InvoicingObligation.Answers answers;
        try {
            answers = request.answers().toDomain();
        } catch (IllegalArgumentException e) {
            throw new DomainException("calculator_answers_invalid", e.getMessage());
        }
        leads.create(Kind.CALCULATOR, request.email(), request.policyVersion(), answers);
        return Response.noContent().build();
    }

    @POST
    @Path("/leads/partners")
    @Transactional
    @APIResponse(responseCode = "204", description = "No Content")
    public Response partner(@Valid @NotNull PartnerLeadRequest request) {
        PartnerDetails details = new PartnerDetails(
                request.name().strip(),
                blankToNull(request.company()),
                blankToNull(request.phone()),
                request.companies(),
                blankToNull(request.message()));
        leads.create(Kind.PARTNER, request.email(), request.policyVersion(), details);
        return Response.noContent().build();
    }

    @POST
    @Path("/leads/integrations")
    @Transactional
    @APIResponse(responseCode = "204", description = "No Content")
    public Response integration(@Valid @NotNull IntegrationLeadRequest request) {
        leads.create(
                Kind.INTEGRATION,
                request.email(),
                request.policyVersion(),
                new IntegrationDetails(request.integration()));
        return Response.noContent().build();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
