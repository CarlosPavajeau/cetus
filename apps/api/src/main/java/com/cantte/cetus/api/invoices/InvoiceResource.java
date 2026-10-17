package com.cantte.cetus.api.invoices;

import com.cantte.cetus.api.auth.ApiPrincipal;
import com.cantte.cetus.api.error.ApiError;
import com.cantte.cetus.domain.dian.Hashing;
import com.cantte.cetus.persistence.IdempotencyStore;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Path("/v1/invoices")
@Produces(MediaType.APPLICATION_JSON)
public class InvoiceResource {

    @Inject
    ApiPrincipal principal;
    @Inject
    InvoiceService service;
    @Inject
    IdempotencyStore idempotency;
    @Inject
    ObjectMapper mapper;

    /**
     * Creates an invoice and processes it asynchronously. Returns 202 with the document in
     * RECEIVED status; follow up with GET /v1/invoices/{id} (webhooks coming next).
     */
    @POST
    @Transactional
    public Response create(@HeaderParam("Idempotency-Key") @NotNull String idempotencyKey,
                           @Valid @NotNull InvoiceRequest request) throws JsonProcessingException {
        String rawJson = mapper.writeValueAsString(request);
        String requestHash = Hashing.sha256Hex(rawJson.getBytes(StandardCharsets.UTF_8));

        var outcome = idempotency.begin(principal.accountId(), idempotencyKey, requestHash);
        switch (outcome.state()) {
            case REPLAY:
                return Response.status(outcome.responseStatus()).entity(outcome.responseBody())
                        .type(MediaType.APPLICATION_JSON).header("Idempotent-Replayed", "true").build();
            case IN_PROGRESS:
                return Response.status(409).entity(new ApiError("idempotency_in_progress",
                        "A request with this Idempotency-Key is still being processed", null)).build();
            case MISMATCH:
                return Response.status(422).entity(new ApiError("idempotency_mismatch",
                        "This Idempotency-Key was used with a different request body", null)).build();
            default:
                break;
        }

        DocumentEntity doc = service.create(principal.accountId(), principal.environment(), request, rawJson);
        InvoiceResponse body = InvoiceResponse.from(doc);
        idempotency.complete(principal.accountId(), idempotencyKey, 202, mapper.writeValueAsString(body));
        return Response.accepted(body).build();
    }

    @GET
    @Path("/{id}")
    @Transactional
    public InvoiceResponse get(@PathParam("id") UUID id) {
        return DocumentEntity.findForAccount(principal.accountId(), id, principal.environment())
                .map(InvoiceResponse::from)
                .orElseThrow(() -> new NotFoundException("Invoice not found"));
    }
}
