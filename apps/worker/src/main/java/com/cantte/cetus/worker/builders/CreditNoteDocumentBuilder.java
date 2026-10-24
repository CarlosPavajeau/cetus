package com.cantte.cetus.worker.builders;

import com.cantte.cetus.domain.dian.Cufe;
import com.cantte.cetus.domain.dian.QrCode;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.ElectronicCreditNote;
import com.cantte.cetus.ubl.CreditNoteUblMapper;
import com.cantte.cetus.ubl.UblMarshaller;
import com.cantte.cetus.worker.support.ProcessingContext;
import com.cantte.cetus.worker.support.ProviderSettings;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/** Credit note that references an invoice: CUDE with the software PIN, no numbering resolution. */
@ApplicationScoped
public class CreditNoteDocumentBuilder implements DocumentBuilder {

    private final CreditNoteUblMapper mapper = new CreditNoteUblMapper();
    private final UblMarshaller marshaller = new UblMarshaller();

    @Inject
    ProviderSettings provider;

    @Override
    public DocumentType type() {
        return DocumentType.CREDIT_NOTE;
    }

    @Override
    public BuiltDocument build(ProcessingContext ctx, DocumentSecrets secrets) {
        if (ctx.reference() == null || !(ctx.correctionConcept() instanceof CreditNoteConcept concept)) {
            throw new IllegalStateException(
                    "Credit note " + ctx.documentId() + " has no referenced invoice or concept");
        }
        String number = ctx.fullNumber();
        // Same formula as the CUFE, with the software PIN in place of the technical key.
        String cude = Cufe.compute(new Cufe.Input(
                number,
                ctx.issueDate(),
                ctx.issueTime(),
                ctx.calculation(),
                ctx.supplier().identificationNumber(),
                ctx.customer().identificationNumber(),
                secrets.pin(),
                ctx.environment()));
        String qr = QrCode.note(
                number,
                ctx.issueDate(),
                ctx.issueTime(),
                ctx.supplier().identificationNumber(),
                ctx.customer().identificationNumber(),
                ctx.calculation(),
                cude,
                ctx.environment());

        ElectronicCreditNote note = new ElectronicCreditNote(
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
                cude,
                qr,
                ctx.notes());
        return new BuiltDocument(marshaller.toDocument(mapper.map(note)), cude);
    }
}
