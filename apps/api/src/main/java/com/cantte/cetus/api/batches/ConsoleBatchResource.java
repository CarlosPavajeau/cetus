package com.cantte.cetus.api.batches;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.batches.BatchViews.BatchCreated;
import com.cantte.cetus.api.batches.BatchViews.BatchDocument;
import com.cantte.cetus.api.batches.BatchViews.BatchDocumentPage;
import com.cantte.cetus.api.batches.BatchViews.BatchPage;
import com.cantte.cetus.api.batches.BatchViews.BatchView;
import com.cantte.cetus.api.batches.BatchViews.SameFile;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.console.ConsoleIssuance;
import com.cantte.cetus.api.documents.IdempotentCreation;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.DocumentBatchEntity;
import com.cantte.cetus.persistence.entity.DocumentBatchItemEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DELETE;
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
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** Invoices issued together from a file, as the console sends, follows and downloads them. */
@Path("/console/document-batches")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "404",
        description = "Not Found",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class ConsoleBatchResource {

    static final int PAGE_MAX = 100;

    @Inject
    ConsoleContext context;

    @Inject
    ConsoleIssuance issuance;

    @Inject
    IdempotentCreation idempotentCreation;

    @Inject
    BatchIntake intake;

    @Inject
    AuditLog auditLog;

    @ConfigProperty(name = "cetus.batches.waiting-after", defaultValue = "PT1M")
    Duration waitingAfter;

    @Inject
    RequestOriginResolver origin;

    /**
     * Receives the batch and answers before any document exists: the worker numbers and sends them. The console
     * sends one Idempotency-Key per confirmation and keeps it until it gets an answer, so a retry gets the same batch.
     */
    @POST
    @Transactional
    @APIResponse(
            responseCode = "202",
            description = "Accepted",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = BatchCreated.class)))
    @APIResponse(
            responseCode = "422",
            description = "Unprocessable Entity",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(oneOf = {BatchProblem.class, ProblemDetail.class})))
    @APIResponse(
            responseCode = "409",
            description = "Conflict",
            content =
                    @Content(
                            mediaType = ProblemDetail.MEDIA_TYPE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public Response create(
            @HeaderParam("Idempotency-Key") @NotBlank @Size(max = 100) String idempotencyKey,
            @Valid @NotNull BatchRequest request)
            throws JsonProcessingException {
        UUID accountId = context.accountId();
        IssuerEntity issuer = IssuerEntity.findForAccount(accountId, request.issuerId())
                .orElseThrow(() -> new NotFoundException("Issuer not found"));
        Environment environment = issuer.environment;
        issuance.requireCanIssue(environment);
        BatchIntake.Origin from = new BatchIntake.Origin(
                DocumentBatchEntity.Source.CONSOLE,
                context.userId(),
                context.email().orElse(null));
        return idempotentCreation.accept(
                accountId, environment, "console-batch:" + idempotencyKey, request, rawJson -> {
                    DocumentBatchEntity batch = intake.receive(accountId, issuer, request, from);
                    auditLog.record(
                            accountId,
                            context.actor(),
                            origin.resolve(),
                            AuditAction.DOCUMENT_BATCH_RECEIVED,
                            "document_batch",
                            batch.id,
                            Map.of("issuerId", issuer.id, "items", batch.items, "environment", environment));
                    return new BatchCreated(batch.id, BatchViews.Status.of(batch.status), batch.items);
                });
    }

    /** Newest first: pass the previous page's {@code nextCursor} as {@code before}. */
    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public BatchPage list(
            @QueryParam("environment") @NotNull Environment environment,
            @QueryParam("before") UUID before,
            @QueryParam("limit") @DefaultValue("20") int limit) {
        UUID accountId = context.accountId();
        int size = Math.clamp(limit, 1, PAGE_MAX);
        List<DocumentBatchEntity> rows = DocumentBatchEntity.pageForAccount(accountId, environment, before, size + 1);
        List<DocumentBatchEntity> page = rows.subList(0, Math.min(size, rows.size()));
        Map<UUID, String> issuerNames = issuerNames(page);
        Map<UUID, DocumentBatchEntity.Counts> counts = DocumentBatchEntity.countsOf(page);
        Map<UUID, OffsetDateTime> movedAt = DocumentBatchEntity.movedAtOf(page);
        List<BatchView> items = page.stream()
                .map(batch -> BatchView.from(
                        batch,
                        issuerNames.getOrDefault(batch.issuerId, ""),
                        counts.get(batch.id),
                        movedAt.get(batch.id),
                        waitingAfter))
                .toList();
        return new BatchPage(items, rows.size() > size ? page.getLast().id : null);
    }

    /** The newest batch sent with the same file for the issuer in the last day, so the console can warn about it. */
    @GET
    @Path("/same-file")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public SameFileResult sameFile(
            @QueryParam("issuerId") @NotNull UUID issuerId,
            @QueryParam("fileSha256") @NotNull @Pattern(regexp = "[0-9a-f]{64}") String fileSha256) {
        UUID accountId = context.accountId();
        IssuerEntity issuer = IssuerEntity.findForAccount(accountId, issuerId)
                .orElseThrow(() -> new NotFoundException("Issuer not found"));
        return new SameFileResult(DocumentBatchEntity.findSameFile(
                        accountId,
                        issuer.id,
                        issuer.environment,
                        fileSha256,
                        OffsetDateTime.now().minusDays(1))
                .map(batch -> new SameFile(batch.id, BatchViews.Status.of(batch.status), batch.createdAt))
                .orElse(null));
    }

    public record SameFileResult(@Schema(nullable = true) SameFile batch) {}

    @GET
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public BatchView get(@PathParam("id") UUID id) {
        DocumentBatchEntity batch = find(id);
        IssuerEntity issuer = IssuerEntity.findById(batch.issuerId);
        return BatchView.from(batch, issuer.legalName, batch.counts(), batch.movedAt(), waitingAfter);
    }

    /** Someone removed from the organization: the batches they sent stop emailing them when they finish. */
    @DELETE
    @Path("/senders/{userId}")
    @Transactional
    @APIResponse(responseCode = "204", description = "No Content")
    public void forgetSender(@PathParam("userId") @NotBlank @Size(max = 100) String userId) {
        DocumentBatchEntity.forgetSender(context.accountId(), userId);
    }

    /** By position: pass the previous page's {@code nextCursor} as {@code after}. */
    @GET
    @Path("/{id}/documents")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public BatchDocumentPage documents(
            @PathParam("id") UUID id,
            @QueryParam("status") DocumentStatus status,
            @QueryParam("after") Integer after,
            @QueryParam("limit") @DefaultValue("50") int limit) {
        DocumentBatchEntity batch = find(id);
        int size = Math.clamp(limit, 1, PAGE_MAX);
        String query = "batchId = ?1 and batchPosition > ?2" + (status == null ? "" : " and status = ?3")
                + " order by batchPosition";
        int from = after == null ? -1 : after;
        List<DocumentEntity> rows = (status == null
                        ? DocumentEntity.<DocumentEntity>find(query, batch.id, from)
                        : DocumentEntity.<DocumentEntity>find(query, batch.id, from, status))
                .page(0, size + 1)
                .list();
        List<DocumentEntity> page = rows.subList(0, Math.min(size, rows.size()));
        return new BatchDocumentPage(
                page.stream().map(BatchDocument::from).toList(),
                rows.size() > size ? page.getLast().batchPosition : null);
    }

    /** Every item of the batch with its document, if it got one, as a CSV for a spreadsheet. */
    @GET
    @Path("/{id}/result.csv")
    @Produces("text/csv")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public Response result(@PathParam("id") UUID id) throws IOException {
        DocumentBatchEntity batch = find(id);
        Map<Integer, DocumentEntity> documents = DocumentEntity.<DocumentEntity>list("batchId", batch.id).stream()
                .collect(Collectors.toMap(doc -> doc.batchPosition, Function.identity()));
        List<BatchResultCsv.Row> rows = DocumentBatchItemEntity.listByBatch(batch.id).stream()
                .map(item -> row(item, documents.get(item.position)))
                .toList();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        BatchResultCsv.write(rows, out);
        return Response.ok(out.toByteArray(), "text/csv; charset=utf-8")
                .header("Content-Disposition", "attachment; filename=\"lote-" + batch.id + ".csv\"")
                .build();
    }

    private static BatchResultCsv.Row row(DocumentBatchItemEntity item, DocumentEntity doc) {
        if (doc == null) {
            return new BatchResultCsv.Row(item.reference, item.position, null, null, null, null);
        }
        String reason = switch (doc.status) {
            case REJECTED -> doc.dianErrors.isEmpty() ? doc.dianStatusMessage : String.join(" | ", doc.dianErrors);
            case FAILED -> doc.dianStatusMessage;
            default -> null;
        };
        return new BatchResultCsv.Row(item.reference, item.position, doc.fullNumber(), doc.cufe, doc.status, reason);
    }

    private DocumentBatchEntity find(UUID id) {
        return DocumentBatchEntity.findForAccount(context.accountId(), id)
                .orElseThrow(() -> new NotFoundException("Batch not found"));
    }

    private static Map<UUID, String> issuerNames(List<DocumentBatchEntity> batches) {
        if (batches.isEmpty()) {
            return Map.of();
        }
        return IssuerEntity.<IssuerEntity>list(
                        "id in ?1",
                        batches.stream().map(batch -> batch.issuerId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(issuer -> issuer.id, issuer -> issuer.legalName, (a, b) -> a));
    }
}
