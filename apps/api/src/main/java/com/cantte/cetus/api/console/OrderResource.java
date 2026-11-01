package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.billing.BillingViews.CreateOrderRequest;
import com.cantte.cetus.api.billing.BillingViews.OrderView;
import com.cantte.cetus.api.billing.Orders;
import com.cantte.cetus.api.documents.DocumentFiles;
import com.cantte.cetus.api.error.ProblemDetail;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * The account's purchases. Owners and admins place them; every member reads them. Reading an order never
 * confirms its payment: only Wompi does, through the worker.
 */
@Path("/console/orders")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class OrderResource {

    @Inject
    ConsoleContext context;

    @Inject
    Orders orders;

    @Inject
    RequestOriginResolver origin;

    @POST
    @Transactional
    @Consumes(MediaType.APPLICATION_JSON)
    @APIResponse(
            responseCode = "201",
            description = "Created, with its checkout",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = OrderView.class)))
    @APIResponse(
            responseCode = "422",
            description = "Unprocessable Entity",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "503",
            description = "Payments are not configured",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public Response create(@Valid @NotNull CreateOrderRequest request) {
        OrderView order = orders.create(context.accountId(), request, context.actor(), origin.resolve());
        return Response.status(Response.Status.CREATED).entity(order).build();
    }

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "Newest first")
    public List<OrderView> list(@QueryParam("limit") @DefaultValue("50") @Min(1) @Max(100) int limit) {
        return orders.list(context.accountId(), limit);
    }

    @GET
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "404",
            description = "Not Found",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public OrderView get(@PathParam("id") UUID id) {
        return orders.get(context.accountId(), id);
    }

    /**
     * Charges the pending order to the account's saved card now. The worker makes the charge; the order tells how it
     * went in {@code charge}, and is paid once Wompi approves it.
     */
    @POST
    @Path("/{id}/charge")
    @Transactional
    @APIResponse(responseCode = "200", description = "The charge is on its way")
    @APIResponse(
            responseCode = "404",
            description = "Not Found",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "409",
            description = "A charge of the order waits for Wompi's answer",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "422",
            description = "The order is not payable, or the account has no saved card",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "503",
            description = "Payments are not configured",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public OrderView charge(@PathParam("id") UUID id) {
        return orders.charge(context.accountId(), id, context.actor(), origin.resolve());
    }

    /**
     * A short-lived URL to download a file of the order's invoice: {@code xml}, {@code pdf} or
     * {@code attached-document}. 404 file_not_available until the invoice and its file exist.
     */
    @GET
    @Path("/{id}/invoice/files/{file}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "404",
            description = "Not Found",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public DocumentFiles.DocumentFileResponse invoiceFile(
            @PathParam("id") UUID id,
            @Parameter(schema = @Schema(enumeration = {"xml", "pdf", "attached-document"})) @PathParam("file")
                    String file) {
        return orders.invoiceFile(context.accountId(), id, file);
    }

    /**
     * A short-lived URL to download a file of the credit note of money that went back from the order: {@code xml},
     * {@code pdf} or {@code attached-document}. 404 file_not_available until the note and its file exist.
     */
    @GET
    @Path("/{id}/credit-notes/{documentId}/files/{file}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    @APIResponse(
            responseCode = "404",
            description = "Not Found",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public DocumentFiles.DocumentFileResponse creditNoteFile(
            @PathParam("id") UUID id,
            @PathParam("documentId") UUID documentId,
            @Parameter(schema = @Schema(enumeration = {"xml", "pdf", "attached-document"})) @PathParam("file")
                    String file) {
        return orders.creditNoteFile(context.accountId(), id, documentId, file);
    }
}
