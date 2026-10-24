package com.cantte.cetus.worker.builders;

import com.cantte.cetus.domain.dian.Cufe;
import com.cantte.cetus.domain.dian.QrCode;
import com.cantte.cetus.worker.support.ProcessingContext;

/** CUDE and QR content shared by credit and debit notes. */
record NoteCodes(String cude, String qr) {

    static NoteCodes of(ProcessingContext ctx, String pin) {
        String number = ctx.fullNumber();
        // Same formula as the CUFE, with the software PIN in place of the technical key.
        String cude = Cufe.compute(new Cufe.Input(
                number,
                ctx.issueDate(),
                ctx.issueTime(),
                ctx.calculation(),
                ctx.supplier().identificationNumber(),
                ctx.customer().identificationNumber(),
                pin,
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
        return new NoteCodes(cude, qr);
    }
}
