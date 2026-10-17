package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.error.ApiError;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.util.List;
import java.util.UUID;

@Path("/console/issuers")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(responseCode = "400", description = "Bad Request",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
@APIResponse(responseCode = "404", description = "Not Found",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
@APIResponse(responseCode = "422", description = "Unprocessable Entity",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
public class IssuerResource {

    @Inject
    ConsoleContext context;
    @Inject
    IssuerOnboardingService onboarding;
    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public List<IssuerViews.IssuerView> list() {
        return IssuerEntity.listByAccount(context.account().id).stream().map(IssuerViews.IssuerView::from).toList();
    }

    @POST
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public IssuerViews.IssuerView create(@Valid @NotNull IssuerViews.CreateIssuerRequest request) {
        return IssuerViews.IssuerView.from(onboarding.create(context.account().id, request, context.actor(),
                origin.resolve()));
    }

    @PUT
    @Path("/{id}/software")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public IssuerViews.IssuerView setSoftware(@PathParam("id") UUID id, @Valid @NotNull IssuerViews.SoftwareRequest request) {
        IssuerEntity issuer = issuer(id);
        onboarding.setSoftware(issuer, request, context.actor(), origin.resolve());
        return IssuerViews.IssuerView.from(issuer);
    }

    @PUT
    @Path("/{id}/certificate")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public IssuerViews.IssuerView setCertificate(@PathParam("id") UUID id,
                                                 @Valid @NotNull IssuerViews.CertificateRequest request) {
        IssuerEntity issuer = issuer(id);
        onboarding.setCertificate(issuer, request, context.actor(), origin.resolve());
        return IssuerViews.IssuerView.from(issuer);
    }

    @GET
    @Path("/{id}/numbering-ranges")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public List<IssuerViews.NumberingRangeView> ranges(@PathParam("id") UUID id) {
        return NumberingRangeEntity.listByIssuer(issuer(id).id).stream()
                .map(IssuerViews.NumberingRangeView::from).toList();
    }

    @POST
    @Path("/{id}/numbering-ranges")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public IssuerViews.NumberingRangeView addRange(@PathParam("id") UUID id,
                                                   @Valid @NotNull IssuerViews.NumberingRangeRequest request) {
        return IssuerViews.NumberingRangeView.from(
                onboarding.addRange(issuer(id), request, context.actor(), origin.resolve()));
    }

    private IssuerEntity issuer(UUID id) {
        return IssuerEntity.findForAccount(context.account().id, id)
                .orElseThrow(() -> new NotFoundException("Issuer not found"));
    }
}
