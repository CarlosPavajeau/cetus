package com.cantte.cetus.api.console;

import com.cantte.cetus.api.documents.DeliveryView;
import com.cantte.cetus.api.invoices.InvoiceResponse;
import com.cantte.cetus.domain.calc.Amounts;
import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.MonetaryTotals;
import com.cantte.cetus.domain.calc.TaxAmount;
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
            UUID id,
            Environment environment,
            DocumentType documentType,
            String number,
            DocumentStatus status,
            LocalDate issueDate,
            UUID issuerId,
            String issuerName,
            String customerName,
            String customerIdentification,
            BigDecimal payable,
            String currency,
            @Schema(nullable = true) String externalReference,
            OffsetDateTime createdAt) {

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
            @Schema(description = "Newest first") List<DocumentSummary> items,

            @Schema(nullable = true, description = "Pass as before to get the next page")
            UUID nextCursor) {}

    public record DocumentDetail(
            UUID id,
            Environment environment,
            DocumentType documentType,
            String number,
            DocumentStatus status,

            @Schema(nullable = true, description = "CUFE of an invoice, CUDE of a note")
            String cufe,

            LocalDate issueDate,
            @Schema(nullable = true) LocalDate dueDate,
            String currency,
            DocumentIssuer issuer,
            DocumentCustomer customer,
            List<DocumentLine> lines,

            @Schema(description = "Document-level subtotals by tax")
            List<DocumentTax> taxes,

            InvoiceResponse.Totals totals,
            InvoiceResponse.Dian dian,
            @Schema(nullable = true) String externalReference,
            OffsetDateTime createdAt,

            @Schema(description = "Notes issued against an invoice; empty for a note")
            List<DocumentNote> creditNotes,

            @Schema(description = "Notes issued against an invoice; empty for a note")
            List<DocumentNote> debitNotes,

            @Schema(nullable = true, description = "What credit notes can still take; only for invoices")
            BigDecimal balance,

            @Schema(nullable = true, description = "The invoice a note corrects")
            DocumentInvoice invoice,

            @Schema(nullable = true, description = "Correction concept of a note")
            String concept,

            @Schema(nullable = true, description = "The integrator's reason for a note")
            String description,

            List<DeliveryView> deliveries,

            @Schema(description = "Oldest first") List<DocumentTimeline.DocumentEvent> events) {

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

    public record DocumentPreview(
            List<PreviewLine> lines,

            @Schema(description = "Document-level subtotals by tax")
            List<DocumentTax> taxes,

            InvoiceResponse.Totals totals) {

        static DocumentPreview from(CalculationResult calculation) {
            MonetaryTotals totals = calculation.totals();
            return new DocumentPreview(
                    calculation.lines().stream().map(PreviewLine::from).toList(),
                    calculation.taxTotals().stream()
                            .flatMap(total -> total.subtotals().stream())
                            .map(tax -> new DocumentTax(
                                    tax.type().name(), tax.percent(), tax.taxableAmount(), tax.amount()))
                            .toList(),
                    new InvoiceResponse.Totals(
                            totals.lineExtensionAmount(),
                            totals.taxExclusiveAmount(),
                            totals.taxInclusiveAmount(),
                            totals.payableAmount()));
        }
    }

    public record PreviewLine(
            int lineNumber,

            @Schema(description = "Quantity times unit price, before taxes")
            BigDecimal lineExtension,

            BigDecimal taxAmount) {

        static PreviewLine from(CalculatedLine line) {
            return new PreviewLine(
                    line.number(),
                    line.lineExtensionAmount(),
                    line.taxes().stream()
                            .map(TaxAmount::amount)
                            .reduce(Amounts.round(BigDecimal.ZERO), BigDecimal::add));
        }
    }

    public record DocumentIssuer(
            UUID id,
            String legalName,
            String nit,
            @Schema(nullable = true) String checkDigit) {}

    public record DocumentCustomer(
            String identificationType,
            String identificationNumber,
            @Schema(nullable = true) String checkDigit,
            String legalName,
            @Schema(nullable = true) String email) {

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
            int lineNumber,
            @Schema(nullable = true) String itemCode,
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice,

            @Schema(description = "Quantity times unit price, before taxes")
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

    public record DocumentTax(String type, BigDecimal percent, BigDecimal taxable, BigDecimal amount) {

        static DocumentTax from(DocumentTaxEntity tax) {
            return new DocumentTax(tax.taxType.name(), tax.percent, tax.taxableAmount, tax.taxAmount);
        }
    }

    public record DocumentNote(
            UUID id,
            String number,
            DocumentStatus status,
            String concept,
            BigDecimal payable,
            OffsetDateTime createdAt) {

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
            UUID id, String number, @Schema(nullable = true) String cufe) {}
}
