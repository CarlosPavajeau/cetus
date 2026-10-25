package com.cantte.cetus.api.debitnotes;

import com.cantte.cetus.api.creditnotes.CreditNoteResponse.InvoiceRef;
import com.cantte.cetus.api.documents.DeliveryView;
import com.cantte.cetus.api.invoices.InvoiceResponse;
import com.cantte.cetus.domain.model.DebitNoteConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public record DebitNoteResponse(
        @Schema(description = "Identificador de la nota en Cetus.")
        UUID id,

        @Schema(description = "Ambiente en que se emitió: el de la llave.")
        Environment environment,

        @Schema(description = "Emisor que la emitió.") UUID issuerId,

        @Schema(description = "Número completo, con el prefijo del rango.", example = "NDS1")
        String number,

        @Schema(description = "Estado ante la DIAN.") DocumentStatus status,

        @Schema(
                nullable = true,
                description = "CUDE: código único de la nota ante la DIAN. Nulo hasta que Cetus lo firma.")
        String cude,

        @Schema(description = "Fecha de emisión, en hora de Colombia.")
        LocalDate issueDate,

        @Schema(description = "Moneda ISO 4217.", example = "COP")
        String currency,

        @Schema(description = "La factura que corrige.") InvoiceRef invoice,
        @Schema(description = "Concepto de la nota.") DebitNoteConcept concept,

        @Schema(description = "Motivo de la nota, como lo enviaste.")
        String description,

        @Schema(description = "Totales calculados por Cetus.")
        InvoiceResponse.Totals totals,

        @Schema(description = "Respuesta de la DIAN.") InvoiceResponse.Dian dian,

        @Schema(nullable = true, description = "Tu referencia, si la enviaste.")
        String externalReference,

        @Schema(description = "Cuándo Cetus la recibió.") OffsetDateTime createdAt,

        @Schema(description = "Entregas de la nota aceptada al cliente.")
        List<DeliveryView> deliveries) {

    public static DebitNoteResponse from(DocumentEntity note) {
        DocumentEntity invoice = DocumentEntity.findById(note.referencedDocumentId);
        return new DebitNoteResponse(
                note.id,
                note.environment,
                note.issuerId,
                note.fullNumber(),
                note.status,
                note.cufe,
                note.issueDate,
                note.currency,
                new InvoiceRef(invoice.id, invoice.fullNumber(), invoice.cufe),
                (DebitNoteConcept) note.concept(),
                note.correctionDescription,
                new InvoiceResponse.Totals(
                        note.lineExtensionAmount, note.taxExclusiveAmount, note.taxInclusiveAmount, note.payableAmount),
                new InvoiceResponse.Dian(
                        note.dianStatusCode, note.dianStatusMessage, List.copyOf(note.dianErrors), note.validatedAt),
                note.externalReference,
                note.createdAt,
                DeliveryView.of(note.id));
    }
}
