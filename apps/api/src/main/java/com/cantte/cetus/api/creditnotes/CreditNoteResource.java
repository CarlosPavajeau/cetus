package com.cantte.cetus.api.creditnotes;

import com.cantte.cetus.api.auth.ApiPrincipal;
import com.cantte.cetus.api.documents.IdempotentCreation;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
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

import java.util.UUID;

@Path("/v1/credit-notes")
@Produces(MediaType.APPLICATION_JSON)
public class CreditNoteResource {

    @Inject
    ApiPrincipal principal;
    @Inject
    CreditNoteService service;
    @Inject
    IdempotentCreation idempotentCreation;

    /**
     * Creates a credit note against an accepted invoice and processes it asynchronously. Returns 202
     * with the note in RECEIVED status; follow up with GET /v1/credit-notes/{id}.
     */
    @POST
    @Transactional
    public Response create(@HeaderParam("Idempotency-Key") @NotNull String idempotencyKey,
                           @Valid @NotNull CreditNoteRequest request) throws JsonProcessingException {
        return idempotentCreation.accept(principal.accountId(), idempotencyKey, request, rawJson ->
                CreditNoteResponse.from(service.create(principal.accountId(), principal.environment(), request, rawJson)));
    }

    @GET
    @Path("/{id}")
    @Transactional
    public CreditNoteResponse get(@PathParam("id") UUID id) {
        return DocumentEntity.findForAccount(principal.accountId(), id, principal.environment())
                .filter(doc -> doc.documentType == DocumentType.CREDIT_NOTE)
                .map(CreditNoteResponse::from)
                .orElseThrow(() -> new NotFoundException("Credit note not found"));
    }
}
