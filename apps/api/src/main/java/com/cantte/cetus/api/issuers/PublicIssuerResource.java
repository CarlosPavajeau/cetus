package com.cantte.cetus.api.issuers;

import com.cantte.cetus.api.auth.ApiPrincipal;
import com.cantte.cetus.api.invoices.InvoiceService;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * The issuers an API key can invoice for: those of its account in its environment. Lets an
 * integration discover the issuerId to send in POST /v1/invoices.
 */
@Path("/v1/issuers")
@Produces(MediaType.APPLICATION_JSON)
public class PublicIssuerResource {

    @Inject
    ApiPrincipal principal;

    public record PublicIssuerView(
            @Schema(required = true) UUID id,
            @Schema(required = true) Environment environment,
            @Schema(required = true) String nit,
            @Schema(required = true) String checkDigit,
            @Schema(required = true) String legalName,
            @Schema(required = true, nullable = true) String tradeName,
            @Schema(required = true) IssuerEntity.Status status,
            @Schema(required = true, description = "Whether its status lets it issue with this key") boolean readyToIssue) {

        static PublicIssuerView from(IssuerEntity issuer) {
            return new PublicIssuerView(issuer.id, issuer.environment, issuer.nit, issuer.checkDigit, issuer.legalName,
                    issuer.tradeName, issuer.status, InvoiceService.canIssue(issuer, issuer.environment));
        }
    }

    @GET
    @Transactional
    public List<PublicIssuerView> list() {
        return IssuerEntity.listByAccount(principal.accountId()).stream()
                .filter(issuer -> issuer.environment == principal.environment())
                .sorted(Comparator.comparing(issuer -> issuer.id))
                .map(PublicIssuerView::from)
                .toList();
    }

    @GET
    @Path("/{id}")
    @Transactional
    public PublicIssuerView get(@PathParam("id") UUID id) {
        return IssuerEntity.findForAccount(principal.accountId(), id)
                .filter(issuer -> issuer.environment == principal.environment())
                .map(PublicIssuerView::from)
                .orElseThrow(() -> new NotFoundException("Issuer not found"));
    }
}
