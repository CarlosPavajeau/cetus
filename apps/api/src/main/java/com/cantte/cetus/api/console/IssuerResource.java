package com.cantte.cetus.api.console;

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

import java.util.List;
import java.util.UUID;

@Path("/console/issuers")
@Produces(MediaType.APPLICATION_JSON)
public class IssuerResource {

    @Inject
    ConsoleContext context;
    @Inject
    IssuerOnboardingService onboarding;

    @GET
    @Transactional
    public List<IssuerViews.IssuerView> list() {
        return IssuerEntity.listByAccount(context.account().id).stream().map(IssuerViews.IssuerView::from).toList();
    }

    @POST
    @Transactional
    public IssuerViews.IssuerView create(@Valid @NotNull IssuerViews.CreateIssuerRequest request) {
        return IssuerViews.IssuerView.from(onboarding.create(context.account().id, request));
    }

    @PUT
    @Path("/{id}/software")
    @Transactional
    public IssuerViews.IssuerView setSoftware(@PathParam("id") UUID id, @Valid @NotNull IssuerViews.SoftwareRequest request) {
        IssuerEntity issuer = issuer(id);
        onboarding.setSoftware(issuer, request);
        return IssuerViews.IssuerView.from(issuer);
    }

    @PUT
    @Path("/{id}/certificate")
    @Transactional
    public IssuerViews.IssuerView setCertificate(@PathParam("id") UUID id,
                                                 @Valid @NotNull IssuerViews.CertificateRequest request) {
        IssuerEntity issuer = issuer(id);
        onboarding.setCertificate(issuer, request);
        return IssuerViews.IssuerView.from(issuer);
    }

    @GET
    @Path("/{id}/numbering-ranges")
    @Transactional
    public List<IssuerViews.NumberingRangeView> ranges(@PathParam("id") UUID id) {
        return NumberingRangeEntity.listByIssuer(issuer(id).id).stream()
                .map(IssuerViews.NumberingRangeView::from).toList();
    }

    @POST
    @Path("/{id}/numbering-ranges")
    @Transactional
    public IssuerViews.NumberingRangeView addRange(@PathParam("id") UUID id,
                                                   @Valid @NotNull IssuerViews.NumberingRangeRequest request) {
        return IssuerViews.NumberingRangeView.from(onboarding.addRange(issuer(id), request));
    }

    private IssuerEntity issuer(UUID id) {
        return IssuerEntity.findForAccount(context.account().id, id)
                .orElseThrow(() -> new NotFoundException("Issuer not found"));
    }
}
