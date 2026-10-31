package com.cantte.cetus.worker.billing;

import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.PaymentInfo;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.AfterCommit;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.PaymentTransactionEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.SigningCertificateEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Cetus' own invoice for each paid order, issued by the platform's issuer to the billing profile the order copied,
 * one line per item. It never takes credits: those pay for the documents of the accounts, not for Cetus' sales.
 */
@ApplicationScoped
public class BillingInvoices {

    private static final Logger LOG = Logger.getLogger(BillingInvoices.class);

    private final InvoiceCalculator calculator = new InvoiceCalculator();

    @ConfigProperty(name = "cetus.billing.invoice-issuer-id")
    Optional<UUID> issuerId;

    @Inject
    JobQueue jobs;

    @Inject
    AfterCommit afterCommit;

    @Inject
    MeterRegistry meters;

    @Inject
    ObjectMapper mapper;

    /** The platform's issuer; without it no order is invoiced. */
    public Optional<UUID> issuerId() {
        return issuerId;
    }

    /** What the document stores as its request: the order it invoices. */
    record Source(UUID orderId, String reference, List<Item> items) {

        record Item(UUID id, BillingOrderItemEntity.Type type, String description, int quantity, long unitPriceCents) {}
    }

    /**
     * Issues the order's invoice from the issuer, unless the order is not paid or already has one: the order stays
     * locked until the invoice is linked to it, so a job run twice issues once.
     *
     * @return the invoice, or empty when there was nothing to issue
     */
    @Transactional
    public Optional<DocumentEntity> issue(UUID orderId, UUID issuerId) {
        BillingOrderEntity order = BillingOrderEntity.lock(orderId).orElseThrow();
        if (order.status != BillingOrderEntity.Status.PAID || order.invoiceDocumentId != null) {
            return Optional.empty();
        }
        IssuerEntity issuer = IssuerEntity.<IssuerEntity>findByIdOptional(issuerId)
                .orElseThrow(() -> new IllegalStateException("The billing issuer " + issuerId + " does not exist"));
        requireReady(issuer);

        List<BillingOrderItemEntity> items = BillingOrderItemEntity.listByOrder(order.id);
        CalculationResult calculation =
                calculator.calculate(items.stream().map(BillingInvoices::line).toList());
        BigDecimal total = BigDecimal.valueOf(order.totalCents).movePointLeft(2);
        if (calculation.totals().payableAmount().compareTo(total) != 0) {
            throw new IllegalStateException("The invoice of order " + order.id + " comes to "
                    + calculation.totals().payableAmount() + " and the order to " + total);
        }

        ZonedDateTime now = ZonedDateTime.now(DianTime.ZONE).truncatedTo(ChronoUnit.SECONDS);
        DocumentEntity doc = DocumentEntity.draft(
                issuer.accountId, issuer, issuer.environment, DocumentType.INVOICE, calculation, now);
        doc.currency = order.currency;
        doc.customer = order.billingProfile;
        doc.payment = new PaymentInfo("1", meansCode(order.id), null);
        doc.notes = List.of("Orden " + order.reference);
        doc.externalReference = order.reference;
        doc.requestPayload = payload(order, items);
        doc.persistAndFlush();
        jobs.enqueue(JobTypes.PROCESS_DOCUMENT, doc.id);
        order.invoiceDocumentId = doc.id;
        LOG.infof("Document %s invoices order %s (%s)", doc.id, order.id, doc.environment);
        afterCommit.run(() -> meters.counter(
                        "cetus.documents.created",
                        "document.type",
                        doc.documentType.name(),
                        "environment",
                        doc.environment.name())
                .increment());
        return Optional.of(doc);
    }

    /** Prices are final while the holder is not responsible for VAT; an item with a tax rate needs this changed. */
    private static LineInput line(BillingOrderItemEntity item) {
        if (item.taxRate.signum() != 0) {
            throw new UnsupportedTaxRate(item);
        }
        return new LineInput(
                itemCode(item),
                item.description,
                BigDecimal.valueOf(item.quantity),
                "94",
                BigDecimal.valueOf(item.unitPriceCents).movePointLeft(2),
                List.of());
    }

    private static String itemCode(BillingOrderItemEntity item) {
        return switch (item.itemType) {
            case PLAN -> {
                PlanVersionEntity version = PlanVersionEntity.<PlanVersionEntity>findByIdOptional(item.planVersionId)
                        .orElseThrow();
                yield PlanEntity.<PlanEntity>findByIdOptional(version.planId).orElseThrow().code;
            }
            case OVERAGE -> "EXCEDENTE";
            case ADJUSTMENT -> "AJUSTE";
        };
    }

    /**
     * The DIAN payment means (annex table 13.3.4.2) of the approved payment: a card, a transfer from an account, or
     * another one, as with an order paid outside Wompi.
     */
    private static String meansCode(UUID orderId) {
        return PaymentTransactionEntity.listByOrder(orderId).stream()
                .filter(payment -> payment.status == PaymentTransactionEntity.Status.APPROVED)
                .findFirst()
                .map(payment -> switch (payment.paymentMethodType) {
                    case "CARD" -> "48";
                    case "PSE", "BANCOLOMBIA_TRANSFER", "NEQUI", "DAVIPLATA" -> "47";
                    case null, default -> "ZZZ";
                })
                .orElse("ZZZ");
    }

    private static void requireReady(IssuerEntity issuer) {
        boolean enabled = issuer.status == IssuerEntity.Status.ENABLED
                || (issuer.environment == Environment.TEST && issuer.status == IssuerEntity.Status.TESTING);
        if (!enabled) {
            throw new IllegalStateException("The billing issuer " + issuer.id + " is " + issuer.status);
        }
        if (issuer.environment == Environment.SANDBOX) {
            return;
        }
        if (SoftwareCredentialEntity.findActive(issuer.id).isEmpty()
                || SigningCertificateEntity.findActive(issuer.id).isEmpty()) {
            throw new IllegalStateException(
                    "The billing issuer " + issuer.id + " has no DIAN software credentials or certificate");
        }
    }

    private String payload(BillingOrderEntity order, List<BillingOrderItemEntity> items) {
        Source source = new Source(
                order.id,
                order.reference,
                items.stream()
                        .map(item -> new Source.Item(
                                item.id, item.itemType, item.description, item.quantity, item.unitPriceCents))
                        .toList());
        try {
            return mapper.writeValueAsString(source);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize the invoice of order " + order.id, e);
        }
    }

    /** An item whose price carries a tax: never retried, it needs the invoice to carry that tax first. */
    public static class UnsupportedTaxRate extends RuntimeException {

        UnsupportedTaxRate(BillingOrderItemEntity item) {
            super("Item " + item.id + " has a tax rate of " + item.taxRate + "; Cetus invoices without VAT");
        }
    }
}
