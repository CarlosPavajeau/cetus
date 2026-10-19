package com.cantte.cetus.api.invoices;

import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record InvoiceResponse(
        @Schema(required = true) UUID id,
        @Schema(required = true) Environment environment,
        @Schema(required = true) UUID issuerId,
        @Schema(required = true) String number,
        @Schema(required = true) DocumentStatus status,
        @Schema(required = true, nullable = true) String cufe,
        @Schema(required = true) LocalDate issueDate,
        @Schema(required = true) String currency,
        @Schema(required = true) Totals totals,
        @Schema(required = true) Dian dian,
        @Schema(required = true, nullable = true) String externalReference,
        @Schema(required = true) OffsetDateTime createdAt,
        @Schema(required = true) List<CreditNoteSummary> creditNotes,
        @Schema(required = true, description = "Payable amount not yet credited by accepted or in-flight credit notes")
        BigDecimal balance) {

    public record Totals(
            @Schema(required = true) BigDecimal lineExtension,
            @Schema(required = true) BigDecimal taxExclusive,
            @Schema(required = true) BigDecimal taxInclusive,
            @Schema(required = true) BigDecimal payable) {
    }

    public record Dian(
            @Schema(required = true, nullable = true) String statusCode,
            @Schema(required = true, nullable = true) String statusMessage,
            @Schema(required = true) List<String> errors,
            @Schema(required = true, nullable = true) OffsetDateTime validatedAt) {
    }

    public record CreditNoteSummary(
            @Schema(required = true) UUID id,
            @Schema(required = true) String number,
            @Schema(required = true) DocumentStatus status,
            @Schema(required = true) CreditNoteConcept concept,
            @Schema(required = true) BigDecimal payable) {
    }

    public static InvoiceResponse from(DocumentEntity doc) {
        List<CreditNoteSummary> creditNotes = DocumentEntity.creditNotesFor(doc.id).stream()
                .map(note -> new CreditNoteSummary(note.id, note.fullNumber(), note.status, note.correctionConcept,
                        note.payableAmount))
                .toList();
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
                doc.payableAmount.subtract(DocumentEntity.committedCreditTotal(doc.id)));
    }
}
