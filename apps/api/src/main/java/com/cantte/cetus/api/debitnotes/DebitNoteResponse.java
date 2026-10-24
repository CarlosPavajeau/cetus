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
        UUID id,
        Environment environment,
        UUID issuerId,
        String number,
        DocumentStatus status,
        @Schema(nullable = true) String cude,
        LocalDate issueDate,
        String currency,
        InvoiceRef invoice,
        DebitNoteConcept concept,
        String description,
        InvoiceResponse.Totals totals,
        InvoiceResponse.Dian dian,
        @Schema(nullable = true) String externalReference,
        OffsetDateTime createdAt,

        @Schema(description = "Deliveries of the accepted note to the customer")
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
