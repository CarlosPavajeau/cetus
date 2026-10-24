package com.cantte.cetus.worker.delivery;

import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.worker.support.ProcessingContext;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Subject and body of the email that delivers a document (annex section 9.1). */
public record DeliveryEmail(String subject, String html, String text) {

    /**
     * A SANDBOX document reaches the account's technical contact instead of its customer, as the email the
     * customer would get, marked as a simulation.
     */
    static final String SANDBOX_NOTICE =
            "Simulación de Cetus: así recibiría este correo su cliente. El documento no tiene "
                    + "validez fiscal y no fue enviado a la DIAN.";

    /**
     * The subject is fixed by the annex: "NIT;Name;Number;Type code;Trade name" (the optional line of
     * business is left out). The body is not regulated.
     */
    public static DeliveryEmail of(ProcessingContext ctx) {
        Party supplier = ctx.supplier();
        String tradeName = supplier.tradeName() == null || supplier.tradeName().isBlank()
                ? supplier.legalName()
                : supplier.tradeName();
        String subject = String.join(
                ";",
                supplier.identificationNumber(),
                supplier.legalName(),
                ctx.fullNumber(),
                ctx.documentType().dianCode(),
                tradeName);

        String kind = switch (ctx.documentType()) {
            case INVOICE -> "la factura electrónica";
            case CREDIT_NOTE -> "la nota crédito electrónica";
            case DEBIT_NOTE -> "la nota débito electrónica";
        };
        String total = money(ctx.calculation().totals().payableAmount()) + " " + ctx.currency();
        String reference = ctx.documentType() == DocumentType.INVOICE || ctx.reference() == null
                ? ""
                : " sobre la factura " + ctx.reference().number();

        String text = """
                Hola, %s:

                %s le envía %s %s%s por %s, validada por la DIAN.

                El archivo adjunto contiene el documento electrónico (AttachedDocument con la validación de la DIAN) \
                y su representación gráfica en PDF.

                %s

                Este es un mensaje automático; por favor no lo responda.
                """.formatted(
                        ctx.customer().legalName(),
                        supplier.legalName(),
                        kind,
                        ctx.fullNumber(),
                        reference,
                        total,
                        contact(tradeName, supplier.email(), supplier.phone()));
        String html = """
                <p>Hola, %s:</p>
                <p><strong>%s</strong> le envía %s <strong>%s</strong>%s por <strong>%s</strong>, validada por la DIAN.</p>
                <p>El archivo adjunto contiene el documento electrónico (AttachedDocument con la validación de la DIAN) \
                y su representación gráfica en PDF.</p>
                <p>%s</p>
                <p style="color:#5f6368;font-size:12px">Este es un mensaje automático; por favor no lo responda.</p>
                """.formatted(
                        escape(ctx.customer().legalName()),
                        escape(supplier.legalName()),
                        kind,
                        escape(ctx.fullNumber()),
                        escape(reference),
                        total,
                        escape(contact(tradeName, supplier.email(), supplier.phone())));
        if (ctx.environment() == Environment.SANDBOX) {
            return new DeliveryEmail(
                    "[Simulación] " + subject,
                    "<p><strong>" + SANDBOX_NOTICE + "</strong></p>\n" + html,
                    SANDBOX_NOTICE + "\n\n" + text);
        }
        return new DeliveryEmail(subject, html, text);
    }

    /**
     * Who to ask about the document. The email is sent from an address nobody reads, so the issuer's own
     * contact is spelled out instead of inviting a reply.
     */
    private static String contact(String issuer, String email, String phone) {
        List<String> channels = new ArrayList<>();
        if (email != null && !email.isBlank()) {
            channels.add(email);
        }
        if (phone != null && !phone.isBlank()) {
            channels.add("al teléfono " + phone);
        }
        if (channels.isEmpty()) {
            return "Si tiene preguntas sobre este documento, comuníquese directamente con " + issuer + ".";
        }
        return "Si tiene preguntas sobre este documento, comuníquese con " + issuer + " en "
                + String.join(" o ", channels) + ".";
    }

    private static String money(BigDecimal amount) {
        return new DecimalFormat("$ #,##0.00", DecimalFormatSymbols.getInstance(Locale.of("es", "CO"))).format(amount);
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
