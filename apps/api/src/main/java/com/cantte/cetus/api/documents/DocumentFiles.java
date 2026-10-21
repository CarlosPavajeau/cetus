package com.cantte.cetus.api.documents;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity.Kind;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.NotFoundException;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

/**
 * Downloads of a document's files. The API never streams them: it answers with a short-lived presigned
 * S3 URL, after checking that the document belongs to the caller's account and environment.
 */
@ApplicationScoped
public class DocumentFiles {

    /** Path value → artifact. "xml" is the signed document as the DIAN validated it. */
    static final Map<String, Kind> KINDS = Map.of(
            "xml", Kind.SIGNED_XML,
            "pdf", Kind.PDF,
            "attached-document", Kind.ATTACHED_DOCUMENT);

    @Inject
    DocumentStorage storage;

    @ConfigProperty(name = "cetus.storage.download-ttl")
    Duration ttl;

    public record DocumentFileResponse(
            @Schema(required = true, description = "Presigned URL; download it without the API key") String url,
            @Schema(required = true) OffsetDateTime expiresAt) {
    }

    /** Must run in a transaction. */
    public DocumentFileResponse presign(UUID accountId, Environment environment, UUID documentId, DocumentType type,
                                        String file) {
        DocumentEntity doc = DocumentEntity.findForAccount(accountId, documentId, environment)
                .filter(d -> d.documentType == type)
                .orElseThrow(() -> new NotFoundException("Document not found"));
        Kind kind = KINDS.get(file);
        if (kind == null) {
            throw new NotFoundException("Unknown file " + file + "; use xml, pdf or attached-document");
        }
        DocumentArtifactEntity artifact = DocumentArtifactEntity.findLatest(doc.id, kind)
                .orElseThrow(() -> new FileNotAvailable(file));
        String key = artifact.s3Key;
        DocumentStorage.PresignedUrl url = storage.presignGet(key, ttl, key.substring(key.lastIndexOf('/') + 1));
        return new DocumentFileResponse(url.url(), url.expiresAt().atOffset(ZoneOffset.UTC));
    }

    /** The document exists but the file is not generated yet (not accepted, or delivery still running). */
    public static class FileNotAvailable extends jakarta.ws.rs.WebApplicationException {

        FileNotAvailable(String file) {
            super(ProblemDetail.response(404, "file_not_available", "The " + file + " file is not available yet"));
        }
    }
}
