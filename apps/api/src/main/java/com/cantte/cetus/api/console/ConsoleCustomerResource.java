package com.cantte.cetus.api.console;

import com.cantte.cetus.api.catalog.Catalog;
import com.cantte.cetus.api.catalog.CatalogViews.CustomerPage;
import com.cantte.cetus.api.catalog.CatalogViews.CustomerView;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.invoices.InvoiceRequest;
import com.cantte.cetus.domain.model.Environment;
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

/** The customers of the account's catalog in one environment, as the console manages them; see the /v1 twin. */
@Path("/console/customers")
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
public class ConsoleCustomerResource {

    @Inject
    ConsoleContext context;

    @Inject
    Catalog catalog;

    /**
     * Newest first: pass the previous page's {@code nextCursor} as {@code before}. {@code q} matches
     * the name or the identification.
     */
    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public CustomerPage list(
            @QueryParam("environment") @NotNull Environment environment,
            @QueryParam("q") @Size(max = 200) @Pattern(regexp = "[^\\p{Cntrl}]*") String q,
            @QueryParam("before") UUID before,
            @QueryParam("limit") @DefaultValue("50") int limit) {
        return catalog.customers(context.accountId(), environment, q, before, limit);
    }

    @GET
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public CustomerView get(@QueryParam("environment") @NotNull Environment environment, @PathParam("id") UUID id) {
        return catalog.customer(context.accountId(), environment, id);
    }

    @POST
    @Transactional
    @APIResponse(
            responseCode = "201",
            description = "Created",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = CustomerView.class)))
    public Response create(
            @QueryParam("environment") @NotNull Environment environment,
            @Valid @NotNull InvoiceRequest.Customer request) {
        return Response.status(201)
                .entity(catalog.createCustomer(context.accountId(), environment, request))
                .build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public CustomerView update(
            @QueryParam("environment") @NotNull Environment environment,
            @PathParam("id") UUID id,
            @Valid @NotNull InvoiceRequest.Customer request) {
        return catalog.updateCustomer(context.accountId(), environment, id, request);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "204", description = "No Content")
    public Response delete(@QueryParam("environment") @NotNull Environment environment, @PathParam("id") UUID id) {
        catalog.deleteCustomer(context.accountId(), environment, id);
        return Response.noContent().build();
    }
}
