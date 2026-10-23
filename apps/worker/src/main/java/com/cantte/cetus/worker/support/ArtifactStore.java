package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.Optional;
import java.util.UUID;

/**
 * Stores a file in S3 under a predictable key, locked for the legal retention period, and records it as a
 * document artifact; reads them back. SANDBOX files have no legal value and are not locked, so the
 * retention job can delete them.
 */
@ApplicationScoped
public class ArtifactStore {

    @Inject
    DocumentStorage storage;
    @Inject
    ResultRecorder recorder;

    public void save(ProcessingContext ctx, DocumentArtifactEntity.Kind kind, String fileName,
                     byte[] content, String contentType) {
        String key = "documents/%s/%s/%d/%02d/%s/%s".formatted(
                ctx.environment().name().toLowerCase(),
                ctx.supplier().identificationNumber(),
                ctx.issueDate().getYear(),
                ctx.issueDate().getMonthValue(),
                ctx.documentId(),
                fileName);
        recorder.artifact(ctx.documentId(), kind, ctx.environment() == Environment.SANDBOX
                ? storage.put(key, content, contentType)
                : storage.putRetained(key, content, contentType));
    }

    /** The newest artifact of a kind with its file name, read from S3 outside any transaction. */
    public Optional<Stored> latest(UUID documentId, DocumentArtifactEntity.Kind kind) {
        Optional<String> key = QuarkusTransaction.requiringNew().call(() ->
                DocumentArtifactEntity.findLatest(documentId, kind).map(artifact -> artifact.s3Key));
        return key.map(k -> new Stored(k.substring(k.lastIndexOf('/') + 1), storage.get(k)));
    }

    public record Stored(String fileName, byte[] content) {
    }
}
