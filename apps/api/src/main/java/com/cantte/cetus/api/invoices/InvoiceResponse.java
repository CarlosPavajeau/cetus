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
        UUID id,
        Environment environment,
        UUID issuerId,
        String number,
        DocumentStatus status,
        @Schema(nullable = true) String cufe,
        LocalDate issueDate,
        String currency,
        Totals totals,
        Dian dian,
        @Schema(nullable = true) String externalReference,
        OffsetDateTime createdAt,
        List<CreditNoteSummary> creditNotes,
        List<DebitNoteSummary> debitNotes,

        @Schema(
                description = "What credit notes can still take: the payable amount plus accepted "
                        + "debit notes, minus accepted or in-flight credit notes")
        BigDecimal balance,

        @Schema(description = "Deliveries of the accepted invoice to the customer")
        List<DeliveryView> deliveries) {

    public record Totals(
            BigDecimal lineExtension, BigDecimal taxExclusive, BigDecimal taxInclusive, BigDecimal payable) {}

    public record Dian(
            @Schema(nullable = true) String statusCode,
            @Schema(nullable = true) String statusMessage,
            List<String> errors,
            @Schema(nullable = true) OffsetDateTime validatedAt) {}

    public record CreditNoteSummary(
            UUID id, String number, DocumentStatus status, CreditNoteConcept concept, BigDecimal payable) {

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

    public record DebitNoteSummary(
            UUID id, String number, DocumentStatus status, DebitNoteConcept concept, BigDecimal payable) {

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
