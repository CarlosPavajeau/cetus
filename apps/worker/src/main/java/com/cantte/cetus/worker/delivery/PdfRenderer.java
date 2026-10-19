package com.cantte.cetus.worker.delivery;

import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.MonetaryTotals;
import com.cantte.cetus.domain.calc.TaxAmount;
import com.cantte.cetus.domain.calc.TaxTotal;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.dian.QrCode;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.NumberingAuthorization;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PaymentInfo;
import com.cantte.cetus.worker.support.ProcessingContext;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.openpdf.text.Chunk;
import org.openpdf.text.Document;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.Image;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.Rectangle;
import org.openpdf.text.pdf.PdfContentByte;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfTemplate;
import org.openpdf.text.pdf.PdfWriter;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Graphic representation of a validated invoice or credit note: a single plain template with the minimum
 * content the DIAN asks for (parties, number, dates, resolution, lines, taxes, totals, CUFE/CUDE, QR and
 * the software legend). Customization per issuer (logo, colors) comes later.
 */
public final class PdfRenderer {

    private static final Locale COLOMBIA = Locale.of("es", "CO");
    private static final Color MUTED = new Color(0x5f, 0x63, 0x68);
    private static final Color RULE = new Color(0xd0, 0xd4, 0xd9);
    private static final Color HEADER_FILL = new Color(0xf1, 0xf3, 0xf5);
    private static final Font TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13);
    private static final Font BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f);
    private static final Font NORMAL = FontFactory.getFont(FontFactory.HELVETICA, 8.5f);
    private static final Font SMALL = FontFactory.getFont(FontFactory.HELVETICA, 7, Font.NORMAL, MUTED);
    private static final Font SMALL_BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, Font.NORMAL, MUTED);
    private static final Map<String, String> PAYMENT_MEANS = Map.of(
            "10", "Efectivo", "20", "Cheque", "42", "Consignación bancaria", "47", "Transferencia débito bancaria",
            "48", "Tarjeta crédito", "49", "Tarjeta débito", "ZZZ", "Otro");

    /**
     * @param softwareName name of the software that generated the document
     * @param providerName technology provider (the issuer itself with "software propio")
     */
    public record Legend(String softwareName, String providerName, String providerNit) {
    }

    /** @param uniqueCode the CUFE (invoice) or CUDE (notes) the DIAN validated */
    public byte[] render(ProcessingContext ctx, String uniqueCode, Legend legend) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document pdf = new Document(PageSize.LETTER, 36, 36, 36, 36);
        PdfWriter writer = PdfWriter.getInstance(pdf, out);
        pdf.addTitle(title(ctx.documentType()) + " " + ctx.fullNumber());
        pdf.addAuthor(ctx.supplier().legalName());
        pdf.addCreator(legend.softwareName());
        pdf.open();

        pdf.add(header(ctx));
        pdf.add(customer(ctx));
        if (ctx.reference() != null) {
            pdf.add(reference(ctx));
        }
        pdf.add(lines(ctx));
        pdf.add(totals(ctx));
        if (!ctx.notes().isEmpty()) {
            pdf.add(notes(ctx.notes()));
        }
        if (ctx.documentType() == DocumentType.INVOICE && ctx.authorization() != null) {
            pdf.add(resolution(ctx.authorization()));
        }
        pdf.add(validation(ctx, uniqueCode, legend, writer.getDirectContent()));
        pdf.close();
        return out.toByteArray();
    }

    private static PdfPTable header(ProcessingContext ctx) {
        Party supplier = ctx.supplier();
        PdfPTable table = table(new float[]{3, 2});

        PdfPCell issuer = cell();
        issuer.addElement(new Paragraph(supplier.legalName(), TITLE));
        if (supplier.tradeName() != null && !supplier.tradeName().equals(supplier.legalName())) {
            issuer.addElement(line(supplier.tradeName(), NORMAL));
        }
        issuer.addElement(line(identification(supplier), NORMAL));
        address(supplier.address()).forEach(text -> issuer.addElement(line(text, NORMAL)));
        contact(supplier).forEach(text -> issuer.addElement(line(text, NORMAL)));
        if (!supplier.taxLevelCodes().isEmpty()) {
            issuer.addElement(line("Responsabilidades fiscales: " + String.join(", ", supplier.taxLevelCodes()), SMALL));
        }
        table.addCell(issuer);

        PdfPCell document = boxed();
        document.addElement(line(title(ctx.documentType()).toUpperCase(COLOMBIA), BOLD));
        document.addElement(new Paragraph("No. " + ctx.fullNumber(), TITLE));
        document.addElement(labelled("Fecha de emisión", DianTime.date(ctx.issueDate()) + " " + DianTime.time(ctx.issueTime())));
        if (ctx.dueDate() != null) {
            document.addElement(labelled("Fecha de vencimiento", DianTime.date(ctx.dueDate())));
        }
        PaymentInfo payment = ctx.payment();
        if (payment != null) {
            document.addElement(labelled("Forma de pago", "2".equals(payment.methodId()) ? "Crédito" : "Contado"));
            document.addElement(labelled("Medio de pago", PAYMENT_MEANS.getOrDefault(payment.meansCode(), payment.meansCode())));
        }
        document.addElement(labelled("Moneda", ctx.currency()));
        table.addCell(document);
        table.setSpacingAfter(10);
        return table;
    }

    private static PdfPTable customer(ProcessingContext ctx) {
        Party customer = ctx.customer();
        PdfPTable table = table(new float[]{1});
        PdfPCell cell = boxed();
        cell.addElement(line("ADQUIRIENTE", SMALL_BOLD));
        cell.addElement(line(customer.legalName(), BOLD));
        cell.addElement(line(identification(customer), NORMAL));
        address(customer.address()).forEach(text -> cell.addElement(line(text, NORMAL)));
        contact(customer).forEach(text -> cell.addElement(line(text, NORMAL)));
        table.addCell(cell);
        table.setSpacingAfter(10);
        return table;
    }

    private static PdfPTable reference(ProcessingContext ctx) {
        PdfPTable table = table(new float[]{1});
        PdfPCell cell = boxed();
        cell.addElement(line("FACTURA QUE SE CORRIGE", SMALL_BOLD));
        cell.addElement(labelled("Número", ctx.reference().number() + "   Fecha: " + DianTime.date(ctx.reference().issueDate())));
        cell.addElement(labelled("CUFE", ctx.reference().cufe()));
        if (ctx.correctionConcept() != null) {
            cell.addElement(labelled("Concepto", ctx.correctionConcept().dianCode() + " - " + ctx.correctionConcept().dianName()));
        }
        if (ctx.correctionDescription() != null && !ctx.correctionDescription().isBlank()) {
            cell.addElement(labelled("Motivo", ctx.correctionDescription()));
        }
        table.addCell(cell);
        table.setSpacingAfter(10);
        return table;
    }

    private static PdfPTable lines(ProcessingContext ctx) {
        PdfPTable table = table(new float[]{0.4f, 1.1f, 3.6f, 0.8f, 0.6f, 1.3f, 0.7f, 1.4f});
        table.setHeaderRows(1);
        for (String heading : List.of("#", "Código", "Descripción", "Cant.", "Und.", "Valor unitario", "IVA %", "Total")) {
            PdfPCell cell = new PdfPCell(new Phrase(heading, BOLD));
            cell.setBackgroundColor(HEADER_FILL);
            cell.setBorderColor(RULE);
            cell.setPadding(4);
            table.addCell(cell);
        }
        for (CalculatedLine line : ctx.calculation().lines()) {
            table.addCell(bodyCell(String.valueOf(line.number()), Element.ALIGN_LEFT));
            table.addCell(bodyCell(line.itemCode() == null ? "" : line.itemCode(), Element.ALIGN_LEFT));
            table.addCell(bodyCell(line.description(), Element.ALIGN_LEFT));
            table.addCell(bodyCell(plain(line.quantity()), Element.ALIGN_RIGHT));
            table.addCell(bodyCell(line.unitCode() == null ? "" : line.unitCode(), Element.ALIGN_LEFT));
            table.addCell(bodyCell(money(line.unitPrice()), Element.ALIGN_RIGHT));
            table.addCell(bodyCell(lineTaxes(line), Element.ALIGN_RIGHT));
            table.addCell(bodyCell(money(line.lineExtensionAmount()), Element.ALIGN_RIGHT));
        }
        table.setSpacingAfter(8);
        return table;
    }

    private static PdfPTable totals(ProcessingContext ctx) {
        MonetaryTotals totals = ctx.calculation().totals();
        PdfPTable table = table(new float[]{4, 1.6f, 1.4f});
        addTotal(table, "Subtotal", totals.lineExtensionAmount(), false);
        for (TaxTotal tax : ctx.calculation().taxTotals()) {
            for (TaxAmount subtotal : tax.subtotals()) {
                addTotal(table, tax.type().dianName() + " " + plain(subtotal.percent()) + " % sobre "
                        + money(subtotal.taxableAmount()), subtotal.amount(), false);
            }
        }
        addTotal(table, "Total impuestos", totals.taxInclusiveAmount().subtract(totals.taxExclusiveAmount()), false);
        addTotal(table, ctx.documentType() == DocumentType.INVOICE ? "Total a pagar" : "Total nota", totals.payableAmount(), true);
        table.setSpacingAfter(10);
        return table;
    }

    private static Paragraph notes(List<String> notes) {
        Paragraph paragraph = new Paragraph();
        paragraph.add(new Chunk("Observaciones: ", SMALL_BOLD));
        paragraph.add(new Chunk(String.join(" · ", notes), SMALL));
        paragraph.setSpacingAfter(8);
        return paragraph;
    }

    private static Paragraph resolution(NumberingAuthorization authorization) {
        String text = "Autorización de numeración de facturación DIAN No. " + authorization.resolutionNumber()
                + " vigente del " + authorization.startDate() + " al " + authorization.endDate()
                + ", prefijo " + authorization.prefix() + " del " + authorization.from() + " al " + authorization.to() + ".";
        Paragraph paragraph = new Paragraph(text, SMALL);
        paragraph.setSpacingAfter(8);
        return paragraph;
    }

    private static PdfPTable validation(ProcessingContext ctx, String uniqueCode, Legend legend, PdfContentByte canvas) {
        String qrContent = ctx.documentType() == DocumentType.INVOICE
                ? QrCode.invoice(ctx.fullNumber(), ctx.issueDate(), ctx.issueTime(), ctx.supplier().identificationNumber(),
                        ctx.customer().identificationNumber(), ctx.calculation(), uniqueCode, ctx.environment())
                : QrCode.note(ctx.fullNumber(), ctx.issueDate(), ctx.issueTime(), ctx.supplier().identificationNumber(),
                        ctx.customer().identificationNumber(), ctx.calculation(), uniqueCode, ctx.environment());

        PdfPTable table = table(new float[]{1, 4});
        PdfPCell qr = new PdfPCell(qr(canvas, qrContent, 96), false);
        qr.setBorder(Rectangle.NO_BORDER);
        qr.setPadding(2);
        table.addCell(qr);

        PdfPCell details = cell();
        String codeName = ctx.documentType() == DocumentType.INVOICE ? "CUFE" : "CUDE";
        details.addElement(line(codeName + ":", SMALL_BOLD));
        details.addElement(line(uniqueCode, SMALL));
        OffsetDateTime validated = ctx.validatedAt();
        if (validated != null) {
            OffsetDateTime colombia = validated.atZoneSameInstant(DianTime.ZONE).toOffsetDateTime();
            details.addElement(line("Validada por la DIAN el " + DianTime.date(colombia.toLocalDate()) + " "
                    + DianTime.time(colombia.toLocalTime()), SMALL));
        }
        details.addElement(line("Escanee el código QR para consultar el documento en el catálogo de la DIAN.", SMALL));
        details.addElement(line("Representación gráfica de " + title(ctx.documentType()).toLowerCase(COLOMBIA)
                + ". Software: " + legend.softwareName() + " · Proveedor tecnológico: " + legend.providerName()
                + " NIT " + legend.providerNit(), SMALL));
        table.addCell(details);
        return table;
    }

    /** The QR as vector squares, so it stays sharp at any zoom and needs no image codec. */
    private static Image qr(PdfContentByte canvas, String content, float size) {
        try {
            BitMatrix matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, 0, 0,
                    Map.of(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M, EncodeHintType.MARGIN, 0,
                            EncodeHintType.CHARACTER_SET, "UTF-8"));
            float module = size / matrix.getWidth();
            PdfTemplate template = canvas.createTemplate(size, size);
            template.setColorFill(Color.BLACK);
            for (int y = 0; y < matrix.getHeight(); y++) {
                for (int x = 0; x < matrix.getWidth(); x++) {
                    if (matrix.get(x, y)) {
                        template.rectangle(x * module, size - (y + 1) * module, module, module);
                    }
                }
            }
            template.fill();
            return Image.getInstance(template);
        } catch (Exception e) {
            throw new IllegalStateException("Could not draw the QR code: " + e.getMessage(), e);
        }
    }

    private static String title(DocumentType type) {
        return switch (type) {
            case INVOICE -> "Factura electrónica de venta";
            case CREDIT_NOTE -> "Nota crédito electrónica";
            case DEBIT_NOTE -> "Nota débito electrónica";
        };
    }

    private static String identification(Party party) {
        String number = party.identificationNumber();
        if (party.identificationType() == IdentificationType.NIT) {
            return "NIT " + number + (party.checkDigit() == null ? "" : "-" + party.checkDigit());
        }
        return idName(party.identificationType()) + " " + number;
    }

    private static String idName(IdentificationType type) {
        return switch (type) {
            case CITIZEN_ID -> "C.C.";
            case FOREIGNER_ID -> "C.E.";
            case PASSPORT -> "Pasaporte";
            case IDENTITY_CARD -> "T.I.";
            case CIVIL_REGISTRY -> "Registro civil";
            case FOREIGNER_CARD -> "Tarjeta de extranjería";
            case FOREIGN_DOCUMENT -> "Documento extranjero";
            case PEP -> "PEP";
            case FOREIGN_NIT -> "NIT de otro país";
            case NUIP -> "NUIP";
            case NIT -> "NIT";
        };
    }

    private static List<String> address(Address address) {
        if (address == null) {
            return List.of();
        }
        String city = address.cityName() + (address.departmentName() == null ? "" : ", " + address.departmentName());
        return List.of(address.line() == null ? "" : address.line(), city);
    }

    private static List<String> contact(Party party) {
        StringBuilder contact = new StringBuilder();
        if (party.email() != null) {
            contact.append(party.email());
        }
        if (party.phone() != null) {
            contact.append(contact.isEmpty() ? "" : " · ").append("Tel. ").append(party.phone());
        }
        return contact.isEmpty() ? List.of() : List.of(contact.toString());
    }

    private static String lineTaxes(CalculatedLine line) {
        return String.join(" ", line.taxes().stream().map(tax -> plain(tax.percent())).toList());
    }

    private static void addTotal(PdfPTable table, String label, BigDecimal amount, boolean strong) {
        PdfPCell spacer = new PdfPCell(new Phrase(""));
        spacer.setBorder(Rectangle.NO_BORDER);
        table.addCell(spacer);
        PdfPCell name = new PdfPCell(new Phrase(label, strong ? BOLD : NORMAL));
        PdfPCell value = new PdfPCell(new Phrase(money(amount), strong ? BOLD : NORMAL));
        for (PdfPCell cell : List.of(name, value)) {
            cell.setBorder(strong ? Rectangle.TOP : Rectangle.NO_BORDER);
            cell.setBorderColor(RULE);
            cell.setPadding(3);
        }
        value.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(name);
        table.addCell(value);
    }

    private static PdfPTable table(float[] widths) {
        PdfPTable table = new PdfPTable(widths);
        table.setWidthPercentage(100);
        return table;
    }

    private static PdfPCell cell() {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(2);
        return cell;
    }

    private static PdfPCell boxed() {
        PdfPCell cell = new PdfPCell();
        cell.setBorderColor(RULE);
        cell.setPadding(6);
        return cell;
    }

    private static PdfPCell bodyCell(String text, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, NORMAL));
        cell.setHorizontalAlignment(alignment);
        cell.setBorderColor(RULE);
        cell.setPadding(4);
        return cell;
    }

    private static Paragraph line(String text, Font font) {
        Paragraph paragraph = new Paragraph(text, font);
        paragraph.setLeading(font.getSize() * 1.35f);
        return paragraph;
    }

    private static Paragraph labelled(String label, String value) {
        Paragraph paragraph = new Paragraph();
        paragraph.setLeading(NORMAL.getSize() * 1.35f);
        paragraph.add(new Chunk(label + ": ", BOLD));
        paragraph.add(new Chunk(value, NORMAL));
        return paragraph;
    }

    private static String money(BigDecimal amount) {
        DecimalFormat format = new DecimalFormat("$ #,##0.00", DecimalFormatSymbols.getInstance(COLOMBIA));
        return format.format(amount);
    }

    /** Quantities and percentages without trailing zeros: 2, 19, 0.5. */
    private static String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
