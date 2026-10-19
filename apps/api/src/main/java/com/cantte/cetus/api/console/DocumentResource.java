package com.cantte.cetus.api.console;

import com.cantte.cetus.api.console.DocumentViews.DocumentDetail;
import com.cantte.cetus.api.console.DocumentViews.DocumentPage;
import com.cantte.cetus.api.console.DocumentViews.DocumentSummary;
import com.cantte.cetus.api.documents.DocumentFiles;
import com.cantte.cetus.api.error.ApiError;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** The account's invoices and notes, in both environments, as the console shows them. */
@Path("/console/documents")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(responseCode = "400", description = "Bad Request",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
@APIResponse(responseCode = "404", description = "Not Found",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
@APIResponse(responseCode = "422", description = "Unprocessable Entity",
        content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ApiError.class)))
public class DocumentResource {

    static final int MAX_PAGE_SIZE = 100;

    @Inject
    ConsoleContext context;
    @Inject
    DocumentFiles files;

    /**
     * Newest first: pass the previous page's {@code nextCursor} as {@code before}. {@code from} and {@code to}
     * bound the issue date; {@code q} matches the number, the external reference and the customer.
     */
    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public DocumentPage list(@QueryParam("environment") Environment environment,
                             @QueryParam("type") DocumentType type,
                             @QueryParam("status") DocumentStatus status,
                             @QueryParam("issuerId") UUID issuerId,
                             @QueryParam("from") LocalDate from,
                             @QueryParam("to") LocalDate to,
                             @QueryParam("q") String q,
                             @QueryParam("before") UUID before,
                             @QueryParam("limit") @DefaultValue("50") int limit) {
        UUID accountId = context.account().id;
        int size = Math.max(1, Math.min(limit, MAX_PAGE_SIZE));
        DocumentEntity.Search search = new DocumentEntity.Search(environment, type, status, issuerId, from, to, q);
        // One more than asked tells whether there is a next page.
        List<DocumentEntity> rows = DocumentEntity.pageForAccount(accountId, search, before, size + 1);
        List<DocumentEntity> page = rows.subList(0, Math.min(size, rows.size()));
        Map<UUID, String> issuerNames = page.isEmpty() ? Map.of()
                : IssuerEntity.<IssuerEntity>list("id in ?1", page.stream().map(d -> d.issuerId).distinct().toList())
                .stream().collect(Collectors.toMap(i -> i.id, i -> i.legalName, (a, b) -> a));
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
    public DocumentFiles.DocumentFileResponse file(@PathParam("id") UUID id,
                                                   @Parameter(schema = @Schema(enumeration = {"xml", "pdf", "attached-document"}))
                                                   @PathParam("file") String file) {
        DocumentEntity doc = find(id);
        return files.presign(doc.accountId, doc.environment, doc.id, doc.documentType, file);
    }

    private DocumentEntity find(UUID id) {
        return DocumentEntity.<DocumentEntity>find("id = ?1 and accountId = ?2", id, context.account().id)
                .firstResultOptional()
                .orElseThrow(() -> new NotFoundException("Document not found"));
    }
}
