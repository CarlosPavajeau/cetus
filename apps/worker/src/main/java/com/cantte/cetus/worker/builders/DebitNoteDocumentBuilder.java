package com.cantte.cetus.worker.builders;

import com.cantte.cetus.domain.model.DebitNoteConcept;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.ElectronicDebitNote;
import com.cantte.cetus.ubl.DebitNoteUblMapper;
import com.cantte.cetus.ubl.UblMarshaller;
import com.cantte.cetus.worker.support.ProcessingContext;
import com.cantte.cetus.worker.support.ProviderSettings;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/** Debit note that references an invoice: CUDE with the software PIN, no numbering resolution. */
@ApplicationScoped
public class DebitNoteDocumentBuilder implements DocumentBuilder {

    private final DebitNoteUblMapper mapper = new DebitNoteUblMapper();
    private final UblMarshaller marshaller = new UblMarshaller();

    @Inject
    ProviderSettings provider;

    @Override
    public DocumentType type() {
        return DocumentType.DEBIT_NOTE;
    }

    @Override
    public BuiltDocument build(ProcessingContext ctx, DocumentSecrets secrets) {
        if (ctx.reference() == null || !(ctx.correctionConcept() instanceof DebitNoteConcept concept)) {
            throw new IllegalStateException("Debit note " + ctx.documentId() + " has no referenced invoice or concept");
        }
        NoteCodes codes = NoteCodes.of(ctx, secrets.pin());

        ElectronicDebitNote note = new ElectronicDebitNote(
                ctx.environment(),
                ctx.prefix(),
                ctx.number(),
                ctx.issueDate(),
                ctx.issueTime(),
                ctx.currency(),
                ctx.supplier(),
                ctx.customer(),
                ctx.payment(),
                ctx.calculation(),
                ctx.reference(),
                concept,
                ctx.correctionDescription(),
                provider.software(ctx, secrets.pin()),
                codes.cude(),
                codes.qr(),
                ctx.notes());
        return new BuiltDocument(marshaller.toDocument(mapper.map(note)), codes.cude());
    }
}
