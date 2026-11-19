package com.cantte.cetus.api.batches;

import com.cantte.cetus.domain.model.DocumentStatus;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * The result of a batch as a CSV that Excel in Spanish opens without its import wizard: UTF-8 with a BOM, cells
 * separated by semicolons. A cell that a spreadsheet would read as a formula is written as text (OWASP CSV
 * injection), since references and DIAN messages come from outside.
 */
public final class BatchResultCsv {

    static final List<String> HEADER =
            List.of("Referencia", "Posición", "Número", "CUFE", "Estado", "Motivo", "Creada");

    private BatchResultCsv() {}

    /** One item of the batch and, if it got one, its document. */
    public record Row(
            String reference, int position, String number, String cufe, DocumentStatus status, String reason) {}

    public static void write(List<Row> rows, OutputStream out) throws IOException {
        Writer writer = new OutputStreamWriter(out, StandardCharsets.UTF_8);
        writer.write('﻿');
        line(writer, HEADER);
        for (Row row : rows) {
            boolean created = row.status() != null;
            line(
                    writer,
                    List.of(
                            row.reference(),
                            Integer.toString(row.position() + 1),
                            created ? row.number() : "",
                            row.cufe() == null ? "" : row.cufe(),
                            status(row.status()),
                            row.reason() == null ? "" : row.reason(),
                            created ? "Sí" : "No"));
        }
        writer.flush();
    }

    private static void line(Writer writer, List<String> cells) throws IOException {
        for (int i = 0; i < cells.size(); i++) {
            if (i > 0) {
                writer.write(';');
            }
            writer.write(cell(cells.get(i)));
        }
        writer.write("\r\n");
    }

    static String cell(String value) {
        String text = value;
        if (!text.isEmpty() && "=+-@\t\r".indexOf(text.charAt(0)) >= 0) {
            text = "'" + text;
        }
        if (text.contains(";") || text.contains("\"") || text.contains("\n") || text.contains("\r")) {
            return "\"" + text.replace("\"", "\"\"") + "\"";
        }
        return text;
    }

    private static String status(DocumentStatus status) {
        return switch (status) {
            case null -> "No creada";
            case ACCEPTED -> "Aceptada";
            case REJECTED -> "Rechazada";
            case FAILED -> "Fallida";
            case RECEIVED, PROCESSING, SUBMITTED -> "En proceso";
        };
    }
}
