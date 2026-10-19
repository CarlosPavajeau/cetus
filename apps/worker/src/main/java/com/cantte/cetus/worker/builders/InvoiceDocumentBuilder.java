package com.cantte.cetus.worker.builders;

import com.cantte.cetus.domain.dian.Cufe;
import com.cantte.cetus.domain.dian.QrCode;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.ElectronicInvoice;
import com.cantte.cetus.ubl.InvoiceUblMapper;
import com.cantte.cetus.ubl.UblMarshaller;
import com.cantte.cetus.worker.support.ProcessingContext;
import com.cantte.cetus.worker.support.ProviderSettings;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/** Sales invoice: CUFE with the range's technical key and InvoiceControl from the numbering resolution. */
@ApplicationScoped
public class InvoiceDocumentBuilder implements DocumentBuilder {

    private final InvoiceUblMapper mapper = new InvoiceUblMapper();
    private final UblMarshaller marshaller = new UblMarshaller();

    @Inject
    ProviderSettings provider;

    @Override
    public DocumentType type() {
        return DocumentType.INVOICE;
    }

    @Override
    public BuiltDocument build(ProcessingContext ctx, DocumentSecrets secrets) {
        String number = ctx.fullNumber();
        String cufe = Cufe.compute(new Cufe.Input(number, ctx.issueDate(), ctx.issueTime(), ctx.calculation(),
                ctx.supplier().identificationNumber(), ctx.customer().identificationNumber(), secrets.technicalKey(),
                ctx.environment()));
        String qr = QrCode.invoice(number, ctx.issueDate(), ctx.issueTime(), ctx.supplier().identificationNumber(),
                ctx.customer().identificationNumber(), ctx.calculation(), cufe, ctx.environment());

        ElectronicInvoice invoice = new ElectronicInvoice(ctx.environment(), ctx.operationType(), ctx.prefix(),
                ctx.number(), ctx.issueDate(), ctx.issueTime(), ctx.dueDate(), ctx.currency(), ctx.supplier(),
                ctx.customer(), ctx.payment(), ctx.calculation(), ctx.authorization(),
                provider.software(ctx, secrets.pin()), cufe, qr, ctx.notes());
        return new BuiltDocument(marshaller.toDocument(mapper.map(invoice)), cufe);
    }
}
