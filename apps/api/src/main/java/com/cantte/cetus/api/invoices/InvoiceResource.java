package com.cantte.cetus.api.invoices;

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
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;

import java.util.UUID;

@Path("/v1/invoices")
@Produces(MediaType.APPLICATION_JSON)
public class InvoiceResource {

    @Inject
    ApiPrincipal principal;
    @Inject
    InvoiceService service;
    @Inject
    IdempotentCreation idempotentCreation;
    @Inject
    DocumentFiles files;

    /**
     * Creates an invoice and processes it asynchronously. Returns 202 with the document in
     * RECEIVED status; follow up with GET /v1/invoices/{id} (webhooks coming next).
     */
    @POST
    @Transactional
    public Response create(@HeaderParam("Idempotency-Key") @NotBlank @Size(max = 100) String idempotencyKey,
                           @Valid @NotNull InvoiceRequest request) throws JsonProcessingException {
        return idempotentCreation.accept(principal.accountId(), principal.environment(), idempotencyKey, request, rawJson ->
                InvoiceResponse.created(service.create(principal.accountId(), principal.environment(), request, rawJson)));
    }

    /** The invoice, with the credit notes issued against it and the balance they leave. */
    @GET
    @Path("/{id}")
    @Transactional
    public InvoiceResponse get(@PathParam("id") UUID id) {
        return DocumentEntity.findForAccount(principal.accountId(), id, principal.environment())
                .filter(doc -> doc.documentType == DocumentType.INVOICE)
                .map(InvoiceResponse::from)
                .orElseThrow(() -> new NotFoundException("Invoice not found"));
    }

    /**
     * A short-lived URL to download one of the invoice's files: {@code xml} (signed, as validated by the
     * DIAN), {@code pdf} or {@code attached-document} (what the customer receives). 404 file_not_available
     * until the file exists.
     */
    @GET
    @Path("/{id}/files/{file}")
    @Transactional
    public DocumentFiles.DocumentFileResponse file(@PathParam("id") UUID id,
                                                   @Parameter(schema = @Schema(enumeration = {"xml", "pdf", "attached-document"}))
                                                   @PathParam("file") String file) {
        return files.presign(principal.accountId(), principal.environment(), id, DocumentType.INVOICE, file);
    }
}
