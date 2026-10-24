package com.cantte.cetus.api.debitnotes;

import com.cantte.cetus.api.auth.ApiPrincipal;
import com.cantte.cetus.api.documents.DocumentFiles;
import com.cantte.cetus.api.documents.IdempotentCreation;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;

@Path("/v1/debit-notes")
@Produces(MediaType.APPLICATION_JSON)
public class DebitNoteResource {

    @Inject
    ApiPrincipal principal;

    @Inject
    DebitNoteService service;

    @Inject
    IdempotentCreation idempotentCreation;

    @Inject
    DocumentFiles files;

    /**
     * Creates a debit note against an accepted invoice and processes it asynchronously. Returns 202
     * with the note in RECEIVED status; follow up with GET /v1/debit-notes/{id}.
     */
    @POST
    @Transactional
    public Response create(
            @HeaderParam("Idempotency-Key") @NotBlank @Size(max = 100) String idempotencyKey,
            @Valid @NotNull DebitNoteRequest request)
            throws JsonProcessingException {
        return idempotentCreation.accept(
                principal.accountId(),
                principal.environment(),
                idempotencyKey,
                request,
                rawJson -> DebitNoteResponse.from(
                        service.create(principal.accountId(), principal.environment(), request, rawJson)));
    }

    @GET
    @Path("/{id}")
    @Transactional
    public DebitNoteResponse get(@PathParam("id") UUID id) {
        return DocumentEntity.findForAccount(principal.accountId(), id, principal.environment())
                .filter(doc -> doc.documentType == DocumentType.DEBIT_NOTE)
                .map(DebitNoteResponse::from)
                .orElseThrow(() -> new NotFoundException("Debit note not found"));
    }

    /**
     * A short-lived URL to download one of the debit note's files: {@code xml} (signed, as validated by the
     * DIAN), {@code pdf} or {@code attached-document} (what the customer receives). 404 file_not_available
     * until the file exists.
     */
    @GET
    @Path("/{id}/files/{file}")
    @Transactional
    public DocumentFiles.DocumentFileResponse file(
            @PathParam("id") UUID id,
            @Parameter(schema = @Schema(enumeration = {"xml", "pdf", "attached-document"})) @PathParam("file")
                    String file) {
        return files.presign(principal.accountId(), principal.environment(), id, DocumentType.DEBIT_NOTE, file);
    }
}
