package com.cantte.cetus.api.invoices;

import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.calc.TaxAmount;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.dian.NitCheckDigit;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PaymentInfo;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
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

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Creates an invoice: validates, calculates, takes the consecutive number and enqueues the job,
 * all in one transaction. The DIAN is never called from here.
 */
@ApplicationScoped
public class InvoiceService {

    private final InvoiceCalculator calculator = new InvoiceCalculator();

    @Inject
    JobQueue jobs;

    @Transactional(Transactional.TxType.MANDATORY)
    public DocumentEntity create(UUID accountId, Environment environment, InvoiceRequest request, String rawJson) {
        IssuerEntity issuer = resolveIssuer(accountId, environment, request.issuerId());
        ensureReady(issuer, environment);

        CalculationResult calculation = calculator.calculate(toLines(request.lines()));
        ZonedDateTime now = ZonedDateTime.now(DianTime.ZONE).truncatedTo(ChronoUnit.SECONDS);
        LocalDate issueDate = now.toLocalDate();
        LocalTime issueTime = now.toLocalTime();

        NumberingRangeEntity range = NumberingRangeEntity.lockActive(issuer.id, DocumentType.INVOICE, issueDate)
                .orElseThrow(() -> new DomainException("no_active_numbering_range",
                        "The issuer has no active numbering range for invoices"));

        DocumentEntity doc = new DocumentEntity();
        doc.id = Ids.newId();
        doc.accountId = accountId;
        doc.issuerId = issuer.id;
        doc.environment = environment;
        doc.documentType = DocumentType.INVOICE;
        doc.numberingRangeId = range.id;
        doc.prefix = range.prefix;
        doc.number = range.take();
        doc.issueDate = issueDate;
        doc.issueTime = issueTime;
        doc.dueDate = request.payment().dueDate();
        doc.currency = request.currency() != null ? request.currency() : "COP";
        doc.customer = toParty(request.customer());
        doc.payment = toPayment(request.payment());
        doc.lineExtensionAmount = calculation.totals().lineExtensionAmount();
        doc.taxExclusiveAmount = calculation.totals().taxExclusiveAmount();
        doc.taxInclusiveAmount = calculation.totals().taxInclusiveAmount();
        doc.payableAmount = calculation.totals().payableAmount();
        doc.notes = request.notes() == null ? List.of() : List.copyOf(request.notes());
        doc.requestPayload = rawJson;
        doc.externalReference = request.externalReference();

        for (CalculatedLine line : calculation.lines()) {
            DocumentLineEntity lineEntity = new DocumentLineEntity();
            lineEntity.id = Ids.newId();
            lineEntity.document = doc;
            lineEntity.lineNumber = line.number();
            lineEntity.itemCode = line.itemCode();
            lineEntity.description = line.description();
            lineEntity.quantity = line.quantity();
            lineEntity.unitCode = line.unitCode();
            lineEntity.unitPrice = line.unitPrice();
            lineEntity.lineExtensionAmount = line.lineExtensionAmount();
            doc.lines.add(lineEntity);
            for (TaxAmount tax : line.taxes()) {
                doc.taxes.add(tax(doc, lineEntity, tax));
            }
        }
        calculation.taxTotals().forEach(total -> total.subtotals().forEach(sub -> doc.taxes.add(tax(doc, null, sub))));

        // Flush so the database-generated createdAt is in the response.
        doc.persistAndFlush();
        jobs.enqueue(JobTypes.PROCESS_DOCUMENT, doc.id);
        return doc;
    }

    /**
     * The issuer named in the request, or, when the request names none, the only one of the account
     * that can issue in this environment. With several, the request has to say which.
     */
    private static IssuerEntity resolveIssuer(UUID accountId, Environment environment, UUID issuerId) {
        if (issuerId != null) {
            return IssuerEntity.findForAccount(accountId, issuerId)
                    .filter(found -> found.environment == environment)
                    .orElseThrow(() -> new DomainException("issuer_not_found",
                            "Issuer not found in the " + environment + " environment"));
        }
        List<IssuerEntity> candidates = IssuerEntity.listByAccount(accountId).stream()
                .filter(issuer -> issuer.environment == environment && canIssue(issuer, environment))
                .toList();
        if (candidates.isEmpty()) {
            throw new DomainException("issuer_not_found",
                    "No issuer can issue documents in the " + environment + " environment");
        }
        if (candidates.size() > 1) {
            throw new DomainException("issuer_required",
                    "The account has several issuers in the " + environment + " environment; send issuerId");
        }
        return candidates.get(0);
    }

    /** Whether the issuer's status lets it issue in the environment: ENABLED, or TESTING with a test key. */
    public static boolean canIssue(IssuerEntity issuer, Environment environment) {
        return issuer.status == IssuerEntity.Status.ENABLED
                || (environment == Environment.TEST && issuer.status == IssuerEntity.Status.TESTING);
    }

    private static void ensureReady(IssuerEntity issuer, Environment environment) {
        if (!canIssue(issuer, environment)) {
            throw new DomainException("issuer_not_ready", "The issuer is not enabled to issue documents yet");
        }
        if (SoftwareCredentialEntity.findActive(issuer.id).isEmpty()) {
            throw new DomainException("issuer_missing_software", "The issuer has no DIAN software credentials");
        }
        if (SigningCertificateEntity.findActive(issuer.id).isEmpty()) {
            throw new DomainException("issuer_missing_certificate", "The issuer has no signing certificate");
        }
    }

    private static List<LineInput> toLines(List<InvoiceRequest.Line> lines) {
        return lines.stream()
                .map(line -> new LineInput(
                        line.itemCode(),
                        line.description(),
                        line.quantity(),
                        line.unitCode() != null ? line.unitCode() : "94",
                        line.unitPrice(),
                        line.taxes() == null ? List.of() : line.taxes().stream()
                                .map(tax -> new LineInput.LineTax(tax.type(), tax.percent()))
                                .toList()))
                .toList();
    }

    private static Party toParty(InvoiceRequest.Customer customer) {
        String checkDigit = customer.checkDigit();
        if (customer.identificationType() == IdentificationType.NIT) {
            String expected = NitCheckDigit.compute(customer.identificationNumber());
            if (checkDigit != null && !checkDigit.equals(expected)) {
                throw new DomainException("customer_check_digit_invalid",
                        "The NIT check digit does not match (expected " + expected + ")");
            }
            checkDigit = expected;
        }
        boolean iva = customer.taxScheme() == InvoiceRequest.CustomerTaxScheme.IVA;
        List<String> taxLevels = customer.taxLevelCodes() == null || customer.taxLevelCodes().isEmpty()
                ? List.of("R-99-PN") : customer.taxLevelCodes();
        Address address = customer.address() == null ? null : new Address(
                customer.address().municipalityCode(),
                customer.address().cityName(),
                customer.address().departmentCode(),
                customer.address().departmentName(),
                customer.address().postalCode(),
                customer.address().line(),
                customer.address().countryCode() != null ? customer.address().countryCode() : "CO",
                customer.address().countryName() != null ? customer.address().countryName() : "Colombia");
        return new Party(customer.personType(), customer.identificationType(), customer.identificationNumber(),
                checkDigit, customer.legalName(), customer.tradeName(), taxLevels,
                iva ? "01" : "ZZ", iva ? "IVA" : "No aplica", address, customer.email(), customer.phone());
    }

    private static PaymentInfo toPayment(InvoiceRequest.Payment payment) {
        if (payment.method() == InvoiceRequest.PaymentMethod.CREDIT && payment.dueDate() == null) {
            throw new DomainException("payment_due_date_required", "Credit payments require a due date");
        }
        String methodId = payment.method() == InvoiceRequest.PaymentMethod.CASH ? "1" : "2";
        return new PaymentInfo(methodId, payment.meansCode(), payment.dueDate());
    }

    private static DocumentTaxEntity tax(DocumentEntity doc, DocumentLineEntity line, TaxAmount amount) {
        DocumentTaxEntity tax = new DocumentTaxEntity();
        tax.id = Ids.newId();
        tax.document = doc;
        tax.line = line;
        tax.taxType = amount.type();
        tax.taxableAmount = amount.taxableAmount();
        tax.percent = amount.percent();
        tax.taxAmount = amount.amount();
        return tax;
    }
}
