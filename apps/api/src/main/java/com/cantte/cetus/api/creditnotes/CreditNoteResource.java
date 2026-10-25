package com.cantte.cetus.api.creditnotes;

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
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.headers.Header;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.ExampleObject;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/v1/credit-notes")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Notas crédito")
@SecurityRequirement(name = "apiKey")
@APIResponse(responseCode = "401", ref = "Unauthorized")
@APIResponse(responseCode = "403", ref = "Forbidden")
@APIResponse(responseCode = "429", ref = "TooManyRequests")
public class CreditNoteResource {

    @Inject
    ApiPrincipal principal;

    @Inject
    CreditNoteService service;

    @Inject
    IdempotentCreation idempotentCreation;

    @Inject
    DocumentFiles files;

    @POST
    @Transactional
    @Operation(
            summary = "Crear una nota crédito",
            description = "Emite una nota crédito sobre una factura aceptada por la DIAN, para anularla o disminuir "
                    + "su valor. El cliente, la moneda y el pago se toman de la factura. Responde 202 con "
                    + "estado `RECEIVED`; consulta el resultado con `GET /v1/credit-notes/{id}` o con el "
                    + "webhook `credit_note.accepted`.")
    @APIResponse(
            responseCode = "202",
            description = "Nota recibida y encolada. Repetir la petición con la misma `Idempotency-Key` "
                    + "devuelve esta misma respuesta.",
            headers = {
                @Header(name = "X-Request-Id", ref = "X-Request-Id"),
                @Header(name = "Idempotent-Replayed", ref = "Idempotent-Replayed")
            },
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = CreditNoteResponse.class)))
    @APIResponse(responseCode = "400", ref = "BadRequest")
    @APIResponse(responseCode = "404", ref = "NotFound")
    @APIResponse(responseCode = "409", ref = "IdempotencyConflict")
    @APIResponse(responseCode = "422", ref = "CorrectionRejected")
    @APIResponse(responseCode = "429", ref = "TooManyDocuments")
    public Response create(
            @Parameter(ref = "IdempotencyKey") @HeaderParam("Idempotency-Key") @NotBlank @Size(max = 100)
                    String idempotencyKey,
            @RequestBody(
                            content =
                                    @Content(
                                            mediaType = MediaType.APPLICATION_JSON,
                                            examples = {
                                                @ExampleObject(name = "anulacion", ref = "CancellationCreditNote"),
                                                @ExampleObject(name = "devolucion", ref = "PartialReturnCreditNote")
                                            }))
                    @Valid
                    @NotNull
                    CreditNoteRequest request)
            throws JsonProcessingException {
        return idempotentCreation.accept(
                principal.accountId(),
                principal.environment(),
                idempotencyKey,
                request,
                rawJson -> CreditNoteResponse.from(
                        service.create(principal.accountId(), principal.environment(), request, rawJson)));
    }

    @GET
    @Path("/{id}")
    @Transactional
    @Operation(
            summary = "Consultar una nota crédito",
            description = "La nota con su estado ante la DIAN, la factura que corrige y sus entregas al cliente.")
    @APIResponse(responseCode = "200", description = "La nota.")
    @APIResponse(responseCode = "404", ref = "NotFound")
    public CreditNoteResponse get(@Parameter(ref = "DocumentId") @PathParam("id") UUID id) {
        return DocumentEntity.findForAccount(principal.accountId(), id, principal.environment())
                .filter(doc -> doc.documentType == DocumentType.CREDIT_NOTE)
                .map(CreditNoteResponse::from)
                .orElseThrow(() -> new NotFoundException("Credit note not found"));
    }

    @GET
    @Path("/{id}/files/{file}")
    @Transactional
    @Operation(
            summary = "Descargar un archivo de la nota crédito",
            description = "Una URL temporal para descargar el XML firmado, el PDF o el AttachedDocument de la nota.")
    @APIResponse(responseCode = "200", description = "La URL de descarga.")
    @APIResponse(responseCode = "404", ref = "FileNotFound")
    public DocumentFiles.DocumentFileResponse file(
            @Parameter(ref = "DocumentId") @PathParam("id") UUID id,
            @Parameter(ref = "DocumentFile") @PathParam("file") String file) {
        return files.presign(principal.accountId(), principal.environment(), id, DocumentType.CREDIT_NOTE, file);
    }
}
