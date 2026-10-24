package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.console.DocumentViews.DocumentDetail;
import com.cantte.cetus.api.console.DocumentViews.DocumentPage;
import com.cantte.cetus.api.console.DocumentViews.DocumentPreview;
import com.cantte.cetus.api.console.DocumentViews.DocumentSummary;
import com.cantte.cetus.api.creditnotes.CreditNoteRequest;
import com.cantte.cetus.api.creditnotes.CreditNoteService;
import com.cantte.cetus.api.debitnotes.DebitNoteRequest;
import com.cantte.cetus.api.debitnotes.DebitNoteService;
import com.cantte.cetus.api.documents.DocumentFiles;
import com.cantte.cetus.api.documents.IdempotentCreation;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.invoices.InvoiceRequest;
import com.cantte.cetus.api.invoices.InvoiceService;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DebitNoteConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** The account's invoices and notes, in every environment, as the console shows and issues them. */
@Path("/console/documents")
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
public class DocumentResource {

    static final int MAX_PAGE_SIZE = 100;

    private final InvoiceCalculator calculator = new InvoiceCalculator();

    @Inject
    ConsoleContext context;

    @Inject
    DocumentFiles files;

    @Inject
    IdempotentCreation idempotentCreation;

    @Inject
    CreditNoteService creditNotes;

    @Inject
    InvoiceService invoices;

    @Inject
    DebitNoteService debitNotes;

    @Inject
    ConsoleIssuance issuance;

    @Inject
    AuditLog auditLog;

    @Inject
    RequestOriginResolver origin;

    /**
     * Newest first: pass the previous page's {@code nextCursor} as {@code before}. {@code from} and {@code to}
     * bound the issue date; {@code q} matches the number, the external reference and the customer. Query
     * parameters skip the JSON checks of {@code SafeStrings}: control characters are refused here, since
     * Postgres rejects a NUL character in text.
     */
    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public DocumentPage list(
            @QueryParam("environment") Environment environment,
            @QueryParam("type") DocumentType type,
            @QueryParam("status") DocumentStatus status,
            @QueryParam("issuerId") UUID issuerId,
            @QueryParam("from") LocalDate from,
            @QueryParam("to") LocalDate to,
            @QueryParam("q") @Size(max = 200) @Pattern(regexp = "[^\\p{Cntrl}]*") String q,
            @QueryParam("before") UUID before,
            @QueryParam("limit") @DefaultValue("50") int limit) {
        UUID accountId = context.account().id;
        int size = Math.max(1, Math.min(limit, MAX_PAGE_SIZE));
        DocumentEntity.Search search = new DocumentEntity.Search(environment, type, status, issuerId, from, to, q);
        // One more than asked tells whether there is a next page.
        List<DocumentEntity> rows = DocumentEntity.pageForAccount(accountId, search, before, size + 1);
        List<DocumentEntity> page = rows.subList(0, Math.min(size, rows.size()));
        Map<UUID, String> issuerNames = page.isEmpty()
                ? Map.of()
                : IssuerEntity.<IssuerEntity>list(
                                "id in ?1",
                                page.stream().map(d -> d.issuerId).distinct().toList())
                        .stream()
                        .collect(Collectors.toMap(i -> i.id, i -> i.legalName, (a, b) -> a));
        List<DocumentSummary> items = page.stream()
                .map(doc -> DocumentSummary.from(doc, issuerNames.getOrDefault(doc.issuerId, "")))
                .toList();
        UUID next = rows.size() > size ? page.get(page.size() - 1).id : null;
        return new DocumentPage(items, next);
    }

    @GET
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public DocumentDetail get(@PathParam("id") UUID id) {
        DocumentEntity doc = find(id);
        return DocumentDetail.from(doc, IssuerEntity.findById(doc.issuerId));
    }

    /**
     * A short-lived URL to download one of the document's files: {@code xml}, {@code pdf} or
     * {@code attached-document}. 404 file_not_available until the file exists.
     */
    @GET
    @Path("/{id}/files/{file}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public DocumentFiles.DocumentFileResponse file(
            @PathParam("id") UUID id,
            @Parameter(schema = @Schema(enumeration = {"xml", "pdf", "attached-document"})) @PathParam("file")
                    String file) {
        DocumentEntity doc = find(id);
        return files.presign(doc.accountId, doc.environment, doc.id, doc.documentType, file);
    }

    /**
     * Cancels an accepted invoice with a credit note for all of it (concept CANCELLATION, every line of the
     * invoice). The console sends one Idempotency-Key per dialog, so a double click issues a single note.
     */
    @POST
    @Path("/{id}/cancellation")
    @Transactional
    @APIResponse(
            responseCode = "202",
            description = "Accepted",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = CancellationResponse.class)))
    public Response cancel(
            @PathParam("id") UUID id,
            @HeaderParam("Idempotency-Key") @NotBlank @Size(max = 100) String idempotencyKey,
            @Valid @NotNull CancellationRequest request)
            throws JsonProcessingException {
        DocumentEntity invoice = find(id);
        issuance.requireCanIssue(invoice.environment);
        UUID accountId = invoice.accountId;
        CreditNoteRequest noteRequest = new CreditNoteRequest(
                invoice.id,
                CreditNoteConcept.CANCELLATION,
                request.description().strip(),
                null,
                null,
                null);
        // Its own namespace, so a key of the console never meets one sent by an integrator to /v1.
        return idempotentCreation.accept(
                accountId, invoice.environment, "console:" + idempotencyKey, noteRequest, rawJson -> {
                    DocumentEntity note = creditNotes.create(accountId, invoice.environment, noteRequest, rawJson);
                    auditLog.record(
                            accountId,
                            context.actor(),
                            origin.resolve(),
                            AuditAction.CREDIT_NOTE_ISSUED,
                            "document",
                            note.id,
                            Map.of(
                                    "number", note.fullNumber(),
                                    "invoiceId", invoice.id,
                                    "invoiceNumber", invoice.fullNumber(),
                                    "concept", CreditNoteConcept.CANCELLATION.name(),
                                    "environment", invoice.environment));
                    return new CancellationResponse(note.id, note.fullNumber());
                });
    }

    /**
     * The lines, taxes and totals a document with these lines would have, from the same calculator that
     * issues it, so the console never computes taxes on its own. Nothing is stored.
     */
    @POST
    @Path("/preview")
    @APIResponse(responseCode = "200", description = "OK")
    public DocumentPreview preview(@Valid @NotNull PreviewRequest request) {
        return DocumentPreview.from(calculator.calculate(InvoiceService.toLines(request.lines())));
    }

    /**
     * Issues an invoice from the console form. The issuer is required and sets the environment; the console
     * sends one Idempotency-Key per form, so a double click issues a single invoice.
     */
    @POST
    @Path("/invoices")
    @Transactional
    @APIResponse(
            responseCode = "202",
            description = "Accepted",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = IssuedDocument.class)))
    public Response issueInvoice(
            @HeaderParam("Idempotency-Key") @NotBlank @Size(max = 100) String idempotencyKey,
            @Valid @NotNull InvoiceRequest request)
            throws JsonProcessingException {
        if (request.issuerId() == null) {
            throw new DomainException("issuer_required", "Choose the issuer of the invoice");
        }
        UUID accountId = context.account().id;
        IssuerEntity issuer = IssuerEntity.findForAccount(accountId, request.issuerId())
                .orElseThrow(() -> new NotFoundException("Issuer not found"));
        Environment environment = issuer.environment;
        issuance.requireCanIssue(environment);
        return idempotentCreation.accept(accountId, environment, "console:" + idempotencyKey, request, rawJson -> {
            DocumentEntity doc = invoices.create(accountId, environment, request, rawJson);
            auditLog.record(
                    accountId,
                    context.actor(),
                    origin.resolve(),
                    AuditAction.INVOICE_ISSUED,
                    "document",
                    doc.id,
                    Map.of(
                            "number",
                            doc.fullNumber(),
                            "issuerId",
                            issuer.id,
                            "payable",
                            doc.payableAmount,
                            "environment",
                            environment));
            return new IssuedDocument(doc.id, doc.fullNumber());
        });
    }

    /** Issues a credit note for some lines of an accepted invoice; a full one goes through the cancellation. */
    @POST
    @Path("/{id}/credit-notes")
    @Transactional
    @APIResponse(
            responseCode = "202",
            description = "Accepted",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = IssuedDocument.class)))
    public Response issueCreditNote(
            @PathParam("id") UUID id,
            @HeaderParam("Idempotency-Key") @NotBlank @Size(max = 100) String idempotencyKey,
            @Valid @NotNull CreditNoteInput request)
            throws JsonProcessingException {
        DocumentEntity invoice = find(id);
        issuance.requireCanIssue(invoice.environment);
        UUID accountId = invoice.accountId;
        CreditNoteRequest noteRequest = new CreditNoteRequest(
                invoice.id, request.concept(), request.description().strip(), request.lines(), null, null);
        return idempotentCreation.accept(
                accountId, invoice.environment, "console:" + idempotencyKey, noteRequest, rawJson -> {
                    DocumentEntity note = creditNotes.create(accountId, invoice.environment, noteRequest, rawJson);
                    recordNote(
                            AuditAction.CREDIT_NOTE_ISSUED,
                            invoice,
                            note,
                            request.concept().name());
                    return new IssuedDocument(note.id, note.fullNumber());
                });
    }

    @POST
    @Path("/{id}/debit-notes")
    @Transactional
    @APIResponse(
            responseCode = "202",
            description = "Accepted",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = IssuedDocument.class)))
    public Response issueDebitNote(
            @PathParam("id") UUID id,
            @HeaderParam("Idempotency-Key") @NotBlank @Size(max = 100) String idempotencyKey,
            @Valid @NotNull DebitNoteInput request)
            throws JsonProcessingException {
        DocumentEntity invoice = find(id);
        issuance.requireCanIssue(invoice.environment);
        UUID accountId = invoice.accountId;
        DebitNoteRequest noteRequest = new DebitNoteRequest(
                invoice.id, request.concept(), request.description().strip(), request.lines(), null, null);
        return idempotentCreation.accept(
                accountId, invoice.environment, "console:" + idempotencyKey, noteRequest, rawJson -> {
                    DocumentEntity note = debitNotes.create(accountId, invoice.environment, noteRequest, rawJson);
                    recordNote(
                            AuditAction.DEBIT_NOTE_ISSUED,
                            invoice,
                            note,
                            request.concept().name());
                    return new IssuedDocument(note.id, note.fullNumber());
                });
    }

    private void recordNote(AuditAction action, DocumentEntity invoice, DocumentEntity note, String concept) {
        auditLog.record(
                invoice.accountId,
                context.actor(),
                origin.resolve(),
                action,
                "document",
                note.id,
                Map.of(
                        "number",
                        note.fullNumber(),
                        "invoiceId",
                        invoice.id,
                        "invoiceNumber",
                        invoice.fullNumber(),
                        "concept",
                        concept,
                        "payable",
                        note.payableAmount,
                        "environment",
                        invoice.environment));
    }

    public record PreviewRequest(@NotEmpty @Size(max = 500) List<InvoiceRequest.@Valid Line> lines) {}

    public record CreditNoteInput(
            @NotNull CreditNoteConcept concept,
            @NotBlank @Size(max = 500) String description,
            @NotEmpty @Size(max = 500) List<InvoiceRequest.@Valid Line> lines) {}

    public record DebitNoteInput(
            @NotNull DebitNoteConcept concept,
            @NotBlank @Size(max = 500) String description,
            @NotEmpty @Size(max = 500) List<InvoiceRequest.@Valid Line> lines) {}

    public record IssuedDocument(UUID id, String number) {}

    public record CancellationRequest(
            @NotBlank @Size(max = 500) String description) {}

    public record CancellationResponse(
            @Schema(description = "The credit note") UUID id, String number) {}

    private DocumentEntity find(UUID id) {
        return DocumentEntity.<DocumentEntity>find("id = ?1 and accountId = ?2", id, context.account().id)
                .firstResultOptional()
                .orElseThrow(() -> new NotFoundException("Document not found"));
    }
}
