package com.cantte.cetus.api.invoices;

import com.cantte.cetus.api.documents.DocumentDrafts;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.dian.NitCheckDigit;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PaymentInfo;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

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
    DocumentDrafts drafts;

    @Transactional(Transactional.TxType.MANDATORY)
    public DocumentEntity create(UUID accountId, Environment environment, InvoiceRequest request, String rawJson) {
        IssuerEntity issuer = resolveIssuer(accountId, environment, request.issuerId());
        drafts.ensureReady(issuer, environment);

        CalculationResult calculation = calculator.calculate(toLines(request.lines()));
        DocumentEntity doc = drafts.draft(accountId, issuer, environment, DocumentType.INVOICE, calculation);
        doc.dueDate = request.payment().dueDate();
        doc.currency = request.currency() != null ? request.currency() : "COP";
        doc.customer = toParty(request.customer());
        doc.payment = toPayment(request.payment());
        doc.notes = request.notes() == null ? List.of() : List.copyOf(request.notes());
        doc.requestPayload = rawJson;
        doc.externalReference = request.externalReference();
        drafts.submit(doc);
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
                .filter(issuer -> issuer.environment == environment && DocumentDrafts.canIssue(issuer, environment))
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

    public static List<LineInput> toLines(List<InvoiceRequest.Line> lines) {
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
        if (!customer.identificationNumber().matches(identificationPattern(customer.identificationType()))) {
            throw new DomainException("customer_identification_invalid",
                    "The identification number does not match the format of " + customer.identificationType());
        }
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
        Address address = customer.address() == null ? null : customer.address().toAddress();
        return new Party(customer.personType(), customer.identificationType(), customer.identificationNumber(),
                checkDigit, customer.legalName(), customer.tradeName(), taxLevels,
                iva ? "01" : "ZZ", iva ? "IVA" : "No aplica", address, customer.email(), customer.phone());
    }

    /**
     * Colombian documents are numbers only; foreign ones may carry letters and dashes. Never spaces or line
     * breaks: the number goes verbatim into the QR, the CUFE and the PDF.
     */
    private static String identificationPattern(IdentificationType type) {
        return switch (type) {
            case NIT -> "\\d{1,15}";
            case CIVIL_REGISTRY, IDENTITY_CARD, CITIZEN_ID, FOREIGNER_ID, NUIP -> "\\d{1,20}";
            case FOREIGNER_CARD, PASSPORT, FOREIGN_DOCUMENT, PEP, FOREIGN_NIT -> "[A-Za-z0-9-]{1,20}";
        };
    }

    private static PaymentInfo toPayment(InvoiceRequest.Payment payment) {
        if (payment.method() == InvoiceRequest.PaymentMethod.CREDIT && payment.dueDate() == null) {
            throw new DomainException("payment_due_date_required", "Credit payments require a due date");
        }
        String methodId = payment.method() == InvoiceRequest.PaymentMethod.CASH ? "1" : "2";
        return new PaymentInfo(methodId, payment.meansCode(), payment.dueDate());
    }
}
