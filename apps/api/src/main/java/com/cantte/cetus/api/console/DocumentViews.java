package com.cantte.cetus.api.console;

import com.cantte.cetus.api.documents.DeliveryView;
import com.cantte.cetus.api.invoices.InvoiceResponse;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.DocumentLineEntity;
import com.cantte.cetus.persistence.entity.DocumentTaxEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** What the console shows of the account's documents. */
public final class DocumentViews {

    private DocumentViews() {}

    public record DocumentSummary(
            @Schema(required = true) UUID id,
            @Schema(required = true) Environment environment,
            @Schema(required = true) DocumentType documentType,
            @Schema(required = true) String number,
            @Schema(required = true) DocumentStatus status,
            @Schema(required = true) LocalDate issueDate,
            @Schema(required = true) UUID issuerId,
            @Schema(required = true) String issuerName,
            @Schema(required = true) String customerName,
            @Schema(required = true) String customerIdentification,
            @Schema(required = true) BigDecimal payable,
            @Schema(required = true) String currency,
            @Schema(required = true, nullable = true) String externalReference,
            @Schema(required = true) OffsetDateTime createdAt) {

        static DocumentSummary from(DocumentEntity doc, String issuerName) {
            return new DocumentSummary(
                    doc.id,
                    doc.environment,
                    doc.documentType,
                    doc.fullNumber(),
                    doc.status,
                    doc.issueDate,
                    doc.issuerId,
                    issuerName,
                    doc.customer.legalName(),
                    doc.customer.identificationNumber(),
                    doc.payableAmount,
                    doc.currency,
                    doc.externalReference,
                    doc.createdAt);
        }
    }

    public record DocumentPage(
            @Schema(required = true, description = "Newest first")
            List<DocumentSummary> items,

            @Schema(required = true, nullable = true, description = "Pass as before to get the next page")
            UUID nextCursor) {}

    public record DocumentDetail(
            @Schema(required = true) UUID id,
            @Schema(required = true) Environment environment,
            @Schema(required = true) DocumentType documentType,
            @Schema(required = true) String number,
            @Schema(required = true) DocumentStatus status,

            @Schema(required = true, nullable = true, description = "CUFE of an invoice, CUDE of a note")
            String cufe,

            @Schema(required = true) LocalDate issueDate,
            @Schema(required = true, nullable = true) LocalDate dueDate,
            @Schema(required = true) String currency,
            @Schema(required = true) DocumentIssuer issuer,
            @Schema(required = true) DocumentCustomer customer,
            @Schema(required = true) List<DocumentLine> lines,

            @Schema(required = true, description = "Document-level subtotals by tax")
            List<DocumentTax> taxes,

            @Schema(required = true) InvoiceResponse.Totals totals,
            @Schema(required = true) InvoiceResponse.Dian dian,
            @Schema(required = true, nullable = true) String externalReference,
            @Schema(required = true) OffsetDateTime createdAt,

            @Schema(required = true, description = "Notes issued against an invoice; empty for a note")
            List<DocumentNote> creditNotes,

            @Schema(required = true, description = "Notes issued against an invoice; empty for a note")
            List<DocumentNote> debitNotes,

            @Schema(
                    required = true,
                    nullable = true,
                    description = "What credit notes can still take; only for invoices")
            BigDecimal balance,

            @Schema(required = true, nullable = true, description = "The invoice a note corrects")
            DocumentInvoice invoice,

            @Schema(required = true, nullable = true, description = "Correction concept of a note")
            String concept,

            @Schema(required = true, nullable = true, description = "The integrator's reason for a note")
            String description,

            @Schema(required = true) List<DeliveryView> deliveries,

            @Schema(required = true, description = "Oldest first")
            List<DocumentTimeline.DocumentEvent> events) {

        static DocumentDetail from(DocumentEntity doc, IssuerEntity issuer) {
            boolean invoice = doc.documentType == DocumentType.INVOICE;
            DocumentEntity referenced =
                    doc.referencedDocumentId == null ? null : DocumentEntity.findById(doc.referencedDocumentId);
            return new DocumentDetail(
                    doc.id,
                    doc.environment,
                    doc.documentType,
                    doc.fullNumber(),
                    doc.status,
                    doc.cufe,
                    doc.issueDate,
                    doc.dueDate,
                    doc.currency,
                    new DocumentIssuer(issuer.id, issuer.legalName, issuer.nit, issuer.checkDigit),
                    DocumentCustomer.from(doc.customer),
                    doc.lines.stream().map(DocumentLine::from).toList(),
                    doc.taxes.stream()
                            .filter(t -> t.line == null)
                            .map(DocumentTax::from)
                            .toList(),
                    new InvoiceResponse.Totals(
                            doc.lineExtensionAmount, doc.taxExclusiveAmount, doc.taxInclusiveAmount, doc.payableAmount),
                    new InvoiceResponse.Dian(
                            doc.dianStatusCode, doc.dianStatusMessage, List.copyOf(doc.dianErrors), doc.validatedAt),
                    doc.externalReference,
                    doc.createdAt,
                    invoice ? DocumentNote.of(doc.id, DocumentType.CREDIT_NOTE) : List.of(),
                    invoice ? DocumentNote.of(doc.id, DocumentType.DEBIT_NOTE) : List.of(),
                    invoice ? DocumentEntity.creditableBalance(doc) : null,
                    referenced == null
                            ? null
                            : new DocumentInvoice(referenced.id, referenced.fullNumber(), referenced.cufe),
                    doc.correctionConcept,
                    doc.correctionDescription,
                    DeliveryView.of(doc.id),
                    DocumentTimeline.of(doc));
        }
    }

    public record DocumentIssuer(
            @Schema(required = true) UUID id,
            @Schema(required = true) String legalName,
            @Schema(required = true) String nit,
            @Schema(required = true, nullable = true) String checkDigit) {}

    public record DocumentCustomer(
            @Schema(required = true) String identificationType,
            @Schema(required = true) String identificationNumber,
            @Schema(required = true, nullable = true) String checkDigit,
            @Schema(required = true) String legalName,
            @Schema(required = true, nullable = true) String email) {

        static DocumentCustomer from(Party party) {
            return new DocumentCustomer(
                    party.identificationType().name(),
                    party.identificationNumber(),
                    party.checkDigit(),
                    party.legalName(),
                    party.email());
        }
    }

    public record DocumentLine(
            @Schema(required = true) int lineNumber,
            @Schema(required = true, nullable = true) String itemCode,
            @Schema(required = true) String description,
            @Schema(required = true) BigDecimal quantity,
            @Schema(required = true) BigDecimal unitPrice,

            @Schema(required = true, description = "Quantity times unit price, before taxes")
            BigDecimal lineExtension) {

        static DocumentLine from(DocumentLineEntity line) {
            return new DocumentLine(
                    line.lineNumber,
                    line.itemCode,
                    line.description,
                    line.quantity,
                    line.unitPrice,
                    line.lineExtensionAmount);
        }
    }

    public record DocumentTax(
            @Schema(required = true) String type,
            @Schema(required = true) BigDecimal percent,
            @Schema(required = true) BigDecimal taxable,
            @Schema(required = true) BigDecimal amount) {

        static DocumentTax from(DocumentTaxEntity tax) {
            return new DocumentTax(tax.taxType.name(), tax.percent, tax.taxableAmount, tax.taxAmount);
        }
    }

    public record DocumentNote(
            @Schema(required = true) UUID id,
            @Schema(required = true) String number,
            @Schema(required = true) DocumentStatus status,
            @Schema(required = true) String concept,
            @Schema(required = true) BigDecimal payable,
            @Schema(required = true) OffsetDateTime createdAt) {

        static List<DocumentNote> of(UUID invoiceId, DocumentType type) {
            return DocumentEntity.notesFor(invoiceId, type).stream()
                    .map(note -> new DocumentNote(
                            note.id,
                            note.fullNumber(),
                            note.status,
                            note.correctionConcept,
                            note.payableAmount,
                            note.createdAt))
                    .toList();
        }
    }

    public record DocumentInvoice(
            @Schema(required = true) UUID id,
            @Schema(required = true) String number,
            @Schema(required = true, nullable = true) String cufe) {}
}
