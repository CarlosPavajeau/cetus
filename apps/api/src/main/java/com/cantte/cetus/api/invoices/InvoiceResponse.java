package com.cantte.cetus.api.invoices;

import com.cantte.cetus.api.documents.DeliveryView;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DebitNoteConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
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
        @Schema(required = true) List<DebitNoteSummary> debitNotes,
        @Schema(required = true, description = "What credit notes can still take: the payable amount plus accepted "
                + "debit notes, minus accepted or in-flight credit notes")
        BigDecimal balance,
        @Schema(required = true, description = "Deliveries of the accepted invoice to the customer")
        List<DeliveryView> deliveries) {

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

        static List<CreditNoteSummary> of(UUID invoiceId) {
            return DocumentEntity.notesFor(invoiceId, DocumentType.CREDIT_NOTE).stream()
                    .map(note -> new CreditNoteSummary(note.id, note.fullNumber(), note.status,
                            (CreditNoteConcept) note.concept(), note.payableAmount))
                    .toList();
        }
    }

    public record DebitNoteSummary(
            @Schema(required = true) UUID id,
            @Schema(required = true) String number,
            @Schema(required = true) DocumentStatus status,
            @Schema(required = true) DebitNoteConcept concept,
            @Schema(required = true) BigDecimal payable) {

        static List<DebitNoteSummary> of(UUID invoiceId) {
            return DocumentEntity.notesFor(invoiceId, DocumentType.DEBIT_NOTE).stream()
                    .map(note -> new DebitNoteSummary(note.id, note.fullNumber(), note.status,
                            (DebitNoteConcept) note.concept(), note.payableAmount))
                    .toList();
        }
    }

    public static InvoiceResponse from(DocumentEntity doc) {
        return of(doc, CreditNoteSummary.of(doc.id), DebitNoteSummary.of(doc.id),
                DocumentEntity.creditableBalance(doc), DeliveryView.of(doc.id));
    }

    /**
     * An invoice created in the current transaction: nothing can reference it before it commits, so it has
     * no notes nor deliveries and its balance is its payable amount, with no queries to find that out.
     */
    public static InvoiceResponse created(DocumentEntity doc) {
        return of(doc, List.of(), List.of(), doc.payableAmount, List.of());
    }

    private static InvoiceResponse of(DocumentEntity doc, List<CreditNoteSummary> creditNotes,
                                      List<DebitNoteSummary> debitNotes, BigDecimal balance,
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
