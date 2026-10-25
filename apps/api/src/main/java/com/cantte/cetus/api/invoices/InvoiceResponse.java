package com.cantte.cetus.api.invoices;

import com.cantte.cetus.api.documents.DeliveryView;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DebitNoteConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public record InvoiceResponse(
        @Schema(description = "Identificador de la factura en Cetus.")
        UUID id,

        @Schema(description = "Ambiente en que se emitió: el de la llave.")
        Environment environment,

        @Schema(description = "Emisor que la emitió.") UUID issuerId,

        @Schema(description = "Número completo, con el prefijo del rango.", example = "SIM1")
        String number,

        @Schema(description = "Estado ante la DIAN.") DocumentStatus status,

        @Schema(
                nullable = true,
                description = "CUFE: código único de la factura ante la DIAN. Nulo hasta que Cetus lo firma.")
        String cufe,

        @Schema(description = "Fecha de emisión, en hora de Colombia.")
        LocalDate issueDate,

        @Schema(description = "Moneda ISO 4217.", example = "COP")
        String currency,

        @Schema(description = "Totales calculados por Cetus.")
        Totals totals,

        @Schema(description = "Respuesta de la DIAN.") Dian dian,

        @Schema(nullable = true, description = "Tu referencia, si la enviaste.")
        String externalReference,

        @Schema(description = "Cuándo Cetus la recibió.") OffsetDateTime createdAt,

        @Schema(description = "Notas crédito emitidas sobre la factura.")
        List<CreditNoteSummary> creditNotes,

        @Schema(description = "Notas débito emitidas sobre la factura.")
        List<DebitNoteSummary> debitNotes,

        @Schema(
                description = "Lo que todavía pueden acreditar las notas crédito: el total a pagar más las notas "
                        + "débito aceptadas, menos las notas crédito aceptadas o en proceso.")
        BigDecimal balance,

        @Schema(description = "Entregas de la factura aceptada al cliente.")
        List<DeliveryView> deliveries) {

    @Schema(description = "Totales del documento.")
    public record Totals(
            @Schema(description = "Suma de las líneas, antes de impuestos.", example = "100000.00")
            BigDecimal lineExtension,

            @Schema(description = "Base sobre la que se calculan los impuestos.", example = "100000.00")
            BigDecimal taxExclusive,

            @Schema(description = "Total con impuestos.", example = "119000.00")
            BigDecimal taxInclusive,

            @Schema(description = "Total a pagar.", example = "119000.00")
            BigDecimal payable) {}

    @Schema(description = "Lo que respondió la DIAN. Todo es nulo o vacío mientras no responde.")
    public record Dian(
            @Schema(nullable = true, description = "Código de estado de la DIAN; `00` es procesado correctamente.")
            String statusCode,

            @Schema(nullable = true, description = "Mensaje de estado de la DIAN.")
            String statusMessage,

            @Schema(
                    description = "Rechazos y notificaciones de la DIAN, cada uno con su regla, por ejemplo `FAK26`. "
                            + "Una notificación no impide la aceptación.")
            List<String> errors,

            @Schema(nullable = true, description = "Cuándo la DIAN lo validó.")
            OffsetDateTime validatedAt) {}

    @Schema(description = "Una nota crédito de la factura.")
    public record CreditNoteSummary(
            @Schema(description = "Identificador de la nota.")
            UUID id,

            @Schema(description = "Número de la nota.", example = "NCS1")
            String number,

            @Schema(description = "Estado ante la DIAN.") DocumentStatus status,
            @Schema(description = "Concepto de la nota.") CreditNoteConcept concept,
            @Schema(description = "Total de la nota.") BigDecimal payable) {

        static List<CreditNoteSummary> of(UUID invoiceId) {
            return DocumentEntity.notesFor(invoiceId, DocumentType.CREDIT_NOTE).stream()
                    .map(note -> new CreditNoteSummary(
                            note.id,
                            note.fullNumber(),
                            note.status,
                            (CreditNoteConcept) note.concept(),
                            note.payableAmount))
                    .toList();
        }
    }

    @Schema(description = "Una nota débito de la factura.")
    public record DebitNoteSummary(
            @Schema(description = "Identificador de la nota.")
            UUID id,

            @Schema(description = "Número de la nota.", example = "NDS1")
            String number,

            @Schema(description = "Estado ante la DIAN.") DocumentStatus status,
            @Schema(description = "Concepto de la nota.") DebitNoteConcept concept,
            @Schema(description = "Total de la nota.") BigDecimal payable) {

        static List<DebitNoteSummary> of(UUID invoiceId) {
            return DocumentEntity.notesFor(invoiceId, DocumentType.DEBIT_NOTE).stream()
                    .map(note -> new DebitNoteSummary(
                            note.id,
                            note.fullNumber(),
                            note.status,
                            (DebitNoteConcept) note.concept(),
                            note.payableAmount))
                    .toList();
        }
    }

    public static InvoiceResponse from(DocumentEntity doc) {
        return of(
                doc,
                CreditNoteSummary.of(doc.id),
                DebitNoteSummary.of(doc.id),
                DocumentEntity.creditableBalance(doc),
                DeliveryView.of(doc.id));
    }

    /**
     * An invoice created in the current transaction: nothing can reference it before it commits, so it has
     * no notes nor deliveries and its balance is its payable amount, with no queries to find that out.
     */
    public static InvoiceResponse created(DocumentEntity doc) {
        return of(doc, List.of(), List.of(), doc.payableAmount, List.of());
    }

    private static InvoiceResponse of(
            DocumentEntity doc,
            List<CreditNoteSummary> creditNotes,
            List<DebitNoteSummary> debitNotes,
            BigDecimal balance,
            List<DeliveryView> deliveries) {
        return new InvoiceResponse(
                doc.id,
                doc.environment,
                doc.issuerId,
                doc.fullNumber(),
                doc.status,
                doc.cufe,
                doc.issueDate,
                doc.currency,
                new Totals(doc.lineExtensionAmount, doc.taxExclusiveAmount, doc.taxInclusiveAmount, doc.payableAmount),
                new Dian(doc.dianStatusCode, doc.dianStatusMessage, List.copyOf(doc.dianErrors), doc.validatedAt),
                doc.externalReference,
                doc.createdAt,
                creditNotes,
                debitNotes,
                balance,
                deliveries);
    }
}
