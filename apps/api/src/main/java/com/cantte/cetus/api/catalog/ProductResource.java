package com.cantte.cetus.api.catalog;

import com.cantte.cetus.api.auth.ApiPrincipal;
import com.cantte.cetus.api.catalog.CatalogViews.ProductPage;
import com.cantte.cetus.api.catalog.CatalogViews.ProductView;
import com.cantte.cetus.api.error.ProblemDetail;
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
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * Products and services saved to fill in the lines of invoices and notes, in the key's environment. A line
 * still sends its description, price and taxes in full: the catalog is a convenience, never a reference.
 */
@Path("/v1/products")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "400",
        description = "Bad Request",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "404",
        description = "Not Found",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "422",
        description = "Unprocessable Entity",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class ProductResource {

    @Inject
    ApiPrincipal principal;

    @Inject
    Catalog catalog;

    /**
     * Newest first: pass the previous page's {@code nextCursor} as {@code before}. {@code q} matches
     * the code or the description.
     */
    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public ProductPage list(
            @QueryParam("q") @Size(max = 200) @Pattern(regexp = "[^\\p{Cntrl}]*") String q,
            @QueryParam("before") UUID before,
            @QueryParam("limit") @DefaultValue("50") int limit) {
        return catalog.products(principal.accountId(), principal.environment(), q, before, limit);
    }

    @GET
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public ProductView get(@PathParam("id") UUID id) {
        return catalog.product(principal.accountId(), principal.environment(), id);
    }

    @POST
    @Transactional
    @APIResponse(
            responseCode = "201",
            description = "Created",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = ProductView.class)))
    public Response create(@Valid @NotNull ProductRequest request) {
        return Response.status(201)
                .entity(catalog.createProduct(principal.accountId(), principal.environment(), request))
                .build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public ProductView update(@PathParam("id") UUID id, @Valid @NotNull ProductRequest request) {
        return catalog.updateProduct(principal.accountId(), principal.environment(), id, request);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "204", description = "No Content")
    public Response delete(@PathParam("id") UUID id) {
        catalog.deleteProduct(principal.accountId(), principal.environment(), id);
        return Response.noContent().build();
    }
}
