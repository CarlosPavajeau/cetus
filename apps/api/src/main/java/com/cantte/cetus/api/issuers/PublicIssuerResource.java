package com.cantte.cetus.api.issuers;

import com.cantte.cetus.api.auth.ApiPrincipal;
import com.cantte.cetus.api.documents.DocumentDrafts;
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
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/**
 * The issuers an API key can invoice for: those of its account in its environment. Lets an
 * integration discover the issuerId to send in POST /v1/invoices.
 */
@Path("/v1/issuers")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Emisores")
@SecurityRequirement(name = "apiKey")
@APIResponse(responseCode = "401", ref = "Unauthorized")
@APIResponse(responseCode = "403", ref = "Forbidden")
@APIResponse(responseCode = "429", ref = "TooManyRequests")
public class PublicIssuerResource {

    @Inject
    ApiPrincipal principal;

    @Schema(description = "Un emisor de la cuenta en el ambiente de la llave.")
    public record PublicIssuerView(
            @Schema(description = "Identificador del emisor; es el `issuerId` de los documentos.")
            UUID id,

            @Schema(description = "Ambiente del emisor, el mismo de la llave.")
            Environment environment,

            @Schema(description = "NIT sin dígito de verificación.", example = "900999999")
            String nit,

            @Schema(description = "Dígito de verificación del NIT.", example = "4")
            String checkDigit,

            @Schema(description = "Razón social o nombre, como figura en el RUT.", example = "Empresa de Ejemplo SAS")
            String legalName,

            @Schema(nullable = true, description = "Nombre comercial, si tiene.")
            String tradeName,

            @Schema(description = "Estado de configuración ante la DIAN.")
            IssuerEntity.Status status,

            @Schema(description = "Si su estado le permite emitir con esta llave.")
            boolean readyToIssue) {

        static PublicIssuerView from(IssuerEntity issuer) {
            return new PublicIssuerView(
                    issuer.id,
                    issuer.environment,
                    issuer.nit,
                    issuer.checkDigit,
                    issuer.legalName,
                    issuer.tradeName,
                    issuer.status,
                    DocumentDrafts.canIssue(issuer, issuer.environment));
        }
    }

    @GET
    @Transactional
    @Operation(
            summary = "Listar los emisores",
            description = "Los emisores de la cuenta en el ambiente de la llave. `readyToIssue` dice cuáles pueden "
                    + "emitir; con uno solo, los documentos pueden omitir `issuerId`.")
    @APIResponse(responseCode = "200", description = "Los emisores, del más antiguo al más reciente.")
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
    @Operation(summary = "Consultar un emisor")
    @APIResponse(responseCode = "200", description = "El emisor.")
    @APIResponse(responseCode = "404", ref = "NotFound")
    public PublicIssuerView get(@Parameter(ref = "ResourceId") @PathParam("id") UUID id) {
        return IssuerEntity.findForAccount(principal.accountId(), id)
                .filter(issuer -> issuer.environment == principal.environment())
                .map(PublicIssuerView::from)
                .orElseThrow(() -> new NotFoundException("Issuer not found"));
    }
}
