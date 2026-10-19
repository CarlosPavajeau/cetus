package com.cantte.cetus.worker.builders;

import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.worker.support.ProcessingContext;

/**
 * Builds the unsigned UBL of one document type. Everything after it (signing, naming, zipping,
 * sending and recording) is the same for every type and stays in the handler.
 */
public interface DocumentBuilder {

    DocumentType type();

    BuiltDocument build(ProcessingContext ctx, DocumentSecrets secrets);
}
