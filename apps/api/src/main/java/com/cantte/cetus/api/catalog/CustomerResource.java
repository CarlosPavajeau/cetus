package com.cantte.cetus.api.catalog;

import com.cantte.cetus.api.auth.ApiPrincipal;
import com.cantte.cetus.api.catalog.CatalogViews.CustomerPage;
import com.cantte.cetus.api.catalog.CatalogViews.CustomerView;
import com.cantte.cetus.api.invoices.InvoiceRequest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.ExampleObject;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/**
 * Customers saved to fill in invoices, in the key's environment. An invoice still sends its customer in
 * full: the catalog is a convenience, never a reference.
 */
@Path("/v1/customers")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Clientes")
@SecurityRequirement(name = "apiKey")
@APIResponse(responseCode = "401", ref = "Unauthorized")
@APIResponse(responseCode = "403", ref = "Forbidden")
@APIResponse(responseCode = "429", ref = "TooManyRequests")
public class CustomerResource {

    @Inject
    ApiPrincipal principal;

    @Inject
    Catalog catalog;

    @GET
    @Transactional
    @Operation(
            summary = "Listar los clientes",
            description = "Del más reciente al más antiguo, por páginas: para la siguiente, envía el `nextCursor` "
                    + "de la anterior como `before`. `q` busca en el nombre o la identificación.")
    @APIResponse(responseCode = "200", description = "Una página de clientes.")
    @APIResponse(responseCode = "400", ref = "BadRequest")
    public CustomerPage list(
            @Parameter(description = "Texto a buscar.")
                    @QueryParam("q")
                    @Size(max = 200)
                    @Pattern(regexp = "[^\\p{Cntrl}]*")
                    String q,
            @Parameter(description = "El `nextCursor` de la página anterior.") @QueryParam("before") UUID before,
            @Parameter(description = "Cuántos clientes devolver, hasta 100.") @QueryParam("limit") @DefaultValue("50")
                    int limit) {
        return catalog.customers(principal.accountId(), principal.environment(), q, before, limit);
    }

    @GET
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Consultar un cliente")
    @APIResponse(responseCode = "200", description = "El cliente.")
    @APIResponse(responseCode = "404", ref = "NotFound")
    public CustomerView get(@Parameter(ref = "ResourceId") @PathParam("id") UUID id) {
        return catalog.customer(principal.accountId(), principal.environment(), id);
    }

    @POST
    @Transactional
    @Operation(summary = "Crear un cliente")
    @APIResponse(responseCode = "400", ref = "BadRequest")
    @APIResponse(responseCode = "422", ref = "CustomerRejected")
    @APIResponse(
            responseCode = "201",
            description = "El cliente creado.",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = CustomerView.class)))
    public Response create(
            @RequestBody(
                            content =
                                    @Content(
                                            mediaType = MediaType.APPLICATION_JSON,
                                            examples = @ExampleObject(name = "cliente", ref = "Customer")))
                    @Valid
                    @NotNull
                    InvoiceRequest.Customer request) {
        return Response.status(201)
                .entity(catalog.createCustomer(principal.accountId(), principal.environment(), request))
                .build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @Operation(
            summary = "Reemplazar un cliente",
            description = "Reemplaza todos sus datos; lo que no se envíe queda vacío. No cambia los documentos ya "
                    + "emitidos.")
    @APIResponse(responseCode = "200", description = "El cliente actualizado.")
    @APIResponse(responseCode = "400", ref = "BadRequest")
    @APIResponse(responseCode = "404", ref = "NotFound")
    @APIResponse(responseCode = "422", ref = "CustomerRejected")
    public CustomerView update(
            @Parameter(ref = "ResourceId") @PathParam("id") UUID id, @Valid @NotNull InvoiceRequest.Customer request) {
        return catalog.updateCustomer(principal.accountId(), principal.environment(), id, request);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Eliminar un cliente", description = "No afecta los documentos ya emitidos.")
    @APIResponse(responseCode = "204", description = "Eliminado.")
    @APIResponse(responseCode = "404", ref = "NotFound")
    public Response delete(@Parameter(ref = "ResourceId") @PathParam("id") UUID id) {
        catalog.deleteCustomer(principal.accountId(), principal.environment(), id);
        return Response.noContent().build();
    }
}
