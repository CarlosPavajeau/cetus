package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/** Stores a file in S3 under a predictable key and records it as a document artifact. */
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
        recorder.artifact(ctx.documentId(), kind, storage.put(key, content, contentType));
    }
}
