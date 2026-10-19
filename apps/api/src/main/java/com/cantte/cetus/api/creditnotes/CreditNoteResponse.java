package com.cantte.cetus.api.creditnotes;

import com.cantte.cetus.api.documents.DeliveryView;
import com.cantte.cetus.api.invoices.InvoiceResponse;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CreditNoteResponse(
        @Schema(required = true) UUID id,
        @Schema(required = true) Environment environment,
        @Schema(required = true) UUID issuerId,
        @Schema(required = true) String number,
        @Schema(required = true) DocumentStatus status,
        @Schema(required = true, nullable = true) String cude,
        @Schema(required = true) LocalDate issueDate,
        @Schema(required = true) String currency,
        @Schema(required = true) InvoiceRef invoice,
        @Schema(required = true) CreditNoteConcept concept,
        @Schema(required = true) String description,
        @Schema(required = true) InvoiceResponse.Totals totals,
        @Schema(required = true) InvoiceResponse.Dian dian,
        @Schema(required = true, nullable = true) String externalReference,
        @Schema(required = true) OffsetDateTime createdAt,
        @Schema(required = true, description = "Deliveries of the accepted note to the customer")
        List<DeliveryView> deliveries) {

    public record InvoiceRef(
            @Schema(required = true) UUID id,
            @Schema(required = true) String number,
            @Schema(required = true) String cufe) {
    }

    public static CreditNoteResponse from(DocumentEntity note) {
        DocumentEntity invoice = DocumentEntity.findById(note.referencedDocumentId);
        return new CreditNoteResponse(
                note.id,
                note.environment,
                note.issuerId,
                note.fullNumber(),
                note.status,
                note.cufe,
                note.issueDate,
                note.currency,
                new InvoiceRef(invoice.id, invoice.fullNumber(), invoice.cufe),
                note.correctionConcept,
                note.correctionDescription,
                new InvoiceResponse.Totals(note.lineExtensionAmount, note.taxExclusiveAmount, note.taxInclusiveAmount,
                        note.payableAmount),
                new InvoiceResponse.Dian(note.dianStatusCode, note.dianStatusMessage, List.copyOf(note.dianErrors),
                        note.validatedAt),
                note.externalReference,
                note.createdAt,
                DeliveryView.of(note.id));
    }
}
