package com.cantte.cetus.worker.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.payments.PaymentStatus;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.CreditReservationEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.billing.PaymentSettlement.Outcome;
import com.cantte.cetus.worker.handlers.ProcessDocumentHandler;
import com.cantte.cetus.worker.support.FakeDian;
import com.cantte.cetus.worker.support.FakeDian.Reply;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** A paid order is invoiced once by the platform's issuer, without credits, and the invoice goes the usual way. */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
class BillingInvoicesTest {

    @Inject
    BillingInvoices invoices;

    @Inject
    PaymentSettlement settlement;

    @Inject
    ProcessDocumentHandler processor;

    @Inject
    WorkerFixtures fixtures;

    @Inject
    FakeDian dian;

    @BeforeEach
    void reset() {
        dian.reset();
    }

    @Test
    void aPaidOrderIsInvoicedOnceToItsBillingProfile() {
        UUID issuerId = platformIssuer();
        BillingOrderEntity order = paidOrder("EMPRENDEDOR");

        DocumentEntity invoice = invoices.issue(order.id, issuerId).orElseThrow();
        assertThat(invoices.issue(order.id, issuerId)).isEmpty();

        DocumentEntity stored = document(invoice.id);
        assertThat(stored.issuerId).isEqualTo(issuerId);
        assertThat(stored.status).isEqualTo(DocumentStatus.RECEIVED);
        assertThat(stored.customer).isEqualTo(order.billingProfile);
        assertThat(stored.externalReference).isEqualTo(order.reference);
        assertThat(stored.payment.methodId()).isEqualTo("1");
        assertThat(stored.payment.meansCode()).isEqualTo("48");
        assertThat(stored.payableAmount).isEqualByComparingTo(BigDecimal.valueOf(order.totalCents, 2));
        assertThat(stored.taxes).isEmpty();
        assertThat(stored.lines).singleElement().satisfies(line -> {
            assertThat(line.itemCode).isEqualTo("EMPRENDEDOR");
            assertThat(line.quantity).isEqualByComparingTo(BigDecimal.ONE);
            assertThat(line.unitPrice).isEqualByComparingTo(BigDecimal.valueOf(order.totalCents, 2));
        });
        assertThat(orderById(order.id).invoiceDocumentId).isEqualTo(invoice.id);
        assertThat(jobs(JobTypes.PROCESS_DOCUMENT, invoice.id)).hasSize(1);
        assertThat(QuarkusTransaction.requiringNew().call(() -> CreditReservationEntity.listByDocument(invoice.id)))
                .isEmpty();
    }

    @Test
    void theInvoiceIsAcceptedAndDelivered() {
        dian.reply("SendBillSync", Reply.fixture("send-bill-sync-accepted.xml"));
        UUID issuerId = platformIssuer();
        BillingOrderEntity order = paidOrder("RECARGA_100");
        UUID invoiceId = invoices.issue(order.id, issuerId).orElseThrow().id;

        processor.handle(fixtures.job(invoiceId, 1));

        assertThat(document(invoiceId).status).isEqualTo(DocumentStatus.ACCEPTED);
        assertThat(jobs(JobTypes.DELIVER_DOCUMENT, invoiceId)).hasSize(1);
    }

    @Test
    void anUnpaidOrderIsNotInvoiced() {
        UUID issuerId = platformIssuer();
        BillingOrderEntity order = fixtures.planOrder(accountOf(fixtures.invoice()), "EMPRENDEDOR");

        assertThat(invoices.issue(order.id, issuerId)).isEmpty();
        assertThat(orderById(order.id).invoiceDocumentId).isNull();
    }

    @Test
    void anItemWithATaxRateIsNotInvoiced() {
        UUID issuerId = platformIssuer();
        BillingOrderEntity order = paidOrder("EMPRENDEDOR");
        QuarkusTransaction.requiringNew()
                .run(() -> BillingOrderEntity.getEntityManager()
                        .createNativeQuery("UPDATE billing.billing_order_items SET tax_rate = 0.19 WHERE order_id = ?1")
                        .setParameter(1, order.id)
                        .executeUpdate());

        assertThat(catchThrowable(() -> invoices.issue(order.id, issuerId)))
                .isInstanceOf(BillingInvoices.UnsupportedTaxRate.class);
        assertThat(orderById(order.id).invoiceDocumentId).isNull();
    }

    @Test
    void withoutTheIssuerConfiguredAPaidOrderEnqueuesNoInvoice() {
        BillingOrderEntity order = paidOrder("EMPRENDEDOR");

        assertThat(jobs(JobTypes.ISSUE_BILLING_INVOICE, order.id)).isEmpty();
    }

    /** The TEST issuer of an account of its own, ready to send, standing for Cetus' own account. */
    private UUID platformIssuer() {
        UUID documentId = fixtures.invoice();
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(documentId).issuerId);
    }

    private BillingOrderEntity paidOrder(String planCode) {
        BillingOrderEntity order = fixtures.planOrder(accountOf(fixtures.invoice()), planCode);
        assertThat(settlement.apply(approved(order))).isEqualTo(Outcome.PAID);
        return orderById(order.id);
    }

    static PaymentTransaction approved(BillingOrderEntity order) {
        Instant now = Instant.now();
        return new PaymentTransaction(
                "12239576-" + order.id,
                order.reference,
                PaymentStatus.APPROVED,
                order.totalCents,
                "COP",
                "CARD",
                Optional.empty(),
                now,
                Optional.of(now),
                "{}");
    }

    private static UUID accountOf(UUID documentId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(documentId).accountId);
    }

    private static BillingOrderEntity orderById(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> BillingOrderEntity.findById(id));
    }

    private static DocumentEntity document(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> {
            DocumentEntity doc = DocumentEntity.findById(id);
            doc.lines.size();
            doc.taxes.size();
            return doc;
        });
    }

    static List<JobEntity> jobs(String type, UUID referenceId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> JobEntity.<JobEntity>list("jobType = ?1 and referenceId = ?2", type, referenceId));
    }
}
