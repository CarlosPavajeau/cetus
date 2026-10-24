package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.MonetaryTotals;
import com.cantte.cetus.domain.calc.TaxAmount;
import com.cantte.cetus.domain.calc.TaxTotal;
import com.cantte.cetus.domain.model.BillingReference;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.TaxType;
import com.cantte.cetus.persistence.entity.DianSubmissionEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.DocumentLineEntity;
import com.cantte.cetus.persistence.entity.DocumentTaxEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.SigningCertificateEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ContextLoader {

    @Inject
    SandboxCredentials sandbox;

    /** Marks the document as PROCESSING and returns its snapshot, or empty if there is nothing to do. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public Optional<ProcessingContext> startProcessing(UUID documentId) {
        DocumentEntity doc = DocumentEntity.findById(documentId);
        if (doc == null || doc.status.isFinal() || doc.status == DocumentStatus.SUBMITTED) {
            return Optional.empty();
        }
        doc.status = DocumentStatus.PROCESSING;
        return Optional.of(load(doc));
    }

    /** Snapshot without changing the status (used by status checks). */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public Optional<ProcessingContext> load(UUID documentId) {
        DocumentEntity doc = DocumentEntity.findById(documentId);
        return Optional.ofNullable(doc).map(this::load);
    }

    private ProcessingContext load(DocumentEntity doc) {
        IssuerEntity issuer = IssuerEntity.findById(doc.issuerId);
        NumberingRangeEntity range = NumberingRangeEntity.findById(doc.numberingRangeId);
        if (doc.environment == Environment.SANDBOX) {
            // Built with the sandbox credentials: no sealed PIN or technical key, no test set.
            return context(doc, issuer, range, null, sandbox.softwareId(), null, null, sandbox.certificate());
        }
        SoftwareCredentialEntity software = SoftwareCredentialEntity.findActive(issuer.id)
                .orElseThrow(() -> new IllegalStateException("Issuer has no software credentials"));
        SigningCertificateEntity certificate = SigningCertificateEntity.findActive(issuer.id)
                .orElseThrow(() -> new IllegalStateException("Issuer has no signing certificate"));
        return context(
                doc,
                issuer,
                range,
                range.technicalKeySealed,
                software.softwareId,
                software.pinSealed,
                activeTestSet(issuer.id, software.testSetId),
                new ProcessingContext.CertificateRef(certificate.id, certificate.s3Key, certificate.passwordSealed));
    }

    private ProcessingContext context(
            DocumentEntity doc,
            IssuerEntity issuer,
            NumberingRangeEntity range,
            byte[] technicalKeySealed,
            String softwareId,
            byte[] pinSealed,
            String testSetId,
            ProcessingContext.CertificateRef certificate) {

        return new ProcessingContext(
                doc.id,
                issuer.id,
                doc.environment,
                doc.documentType,
                doc.operationType,
                doc.prefix,
                doc.number,
                doc.issueDate,
                doc.issueTime,
                doc.dueDate,
                doc.currency,
                issuer.toParty(),
                doc.customer,
                doc.payment,
                List.copyOf(doc.notes),
                calculation(doc),
                range.toAuthorization(),
                reference(doc),
                doc.concept(),
                doc.correctionDescription,
                technicalKeySealed,
                softwareId,
                pinSealed,
                testSetId,
                certificate,
                doc.cufe,
                doc.dianTrackId,
                DianSubmissionEntity.lastSendUnanswered(doc.id),
                doc.status,
                doc.validatedAt);
    }

    /**
     * The test set documents still go to, or null once the DIAN accepted it: from then on the issuer's
     * documents are sent with SendBillSync, even if the software keeps its TestSetId.
     */
    private static String activeTestSet(UUID issuerId, String testSetId) {
        if (testSetId == null || testSetId.isBlank()) {
            return null;
        }
        return SoftwareCredentialEntity.testSetAcceptedAt(issuerId, testSetId) == null ? testSetId : null;
    }

    /** The invoice a note corrects, or null for an invoice. */
    private static BillingReference reference(DocumentEntity doc) {
        if (doc.referencedDocumentId == null) {
            return null;
        }
        DocumentEntity invoice = DocumentEntity.findById(doc.referencedDocumentId);
        return new BillingReference(invoice.fullNumber(), invoice.cufe, invoice.issueDate);
    }

    /** Rebuilds the calculation stored at creation time. Never recalculated, so totals cannot drift. */
    private static CalculationResult calculation(DocumentEntity doc) {
        List<CalculatedLine> lines = new ArrayList<>();
        for (DocumentLineEntity line : doc.lines) {
            List<TaxAmount> lineTaxes = doc.taxes.stream()
                    .filter(tax -> tax.line != null && tax.line.id.equals(line.id))
                    .map(ContextLoader::toTaxAmount)
                    .toList();
            lines.add(new CalculatedLine(
                    line.lineNumber,
                    line.itemCode,
                    line.description,
                    line.quantity,
                    line.unitCode,
                    line.unitPrice,
                    line.lineExtensionAmount,
                    lineTaxes));
        }

        Map<TaxType, List<TaxAmount>> grouped = new EnumMap<>(TaxType.class);
        doc.taxes.stream()
                .filter(tax -> tax.line == null)
                .forEach(tax -> grouped.computeIfAbsent(tax.taxType, t -> new ArrayList<>())
                        .add(toTaxAmount(tax)));
        List<TaxTotal> totals = grouped.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.comparing(TaxType::dianCode)))
                .map(entry -> new TaxTotal(
                        entry.getKey(),
                        entry.getValue().stream().map(TaxAmount::amount).reduce(BigDecimal.ZERO, BigDecimal::add),
                        entry.getValue().stream()
                                .sorted(Comparator.comparing(TaxAmount::percent))
                                .toList()))
                .toList();

        MonetaryTotals monetary = new MonetaryTotals(
                doc.lineExtensionAmount,
                doc.taxExclusiveAmount,
                doc.taxInclusiveAmount,
                doc.allowanceTotalAmount,
                doc.chargeTotalAmount,
                doc.prepaidAmount,
                doc.payableAmount);
        return new CalculationResult(lines, totals, monetary);
    }

    private static TaxAmount toTaxAmount(DocumentTaxEntity tax) {
        return new TaxAmount(tax.taxType, tax.percent, tax.taxableAmount, tax.taxAmount);
    }
}
