package com.cantte.cetus.worker.ops;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.payments.PaymentStatus;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.worker.billing.PaymentSettlement;
import com.cantte.cetus.worker.billing.PaymentSettlement.Outcome;
import com.cantte.cetus.worker.support.BillingIssuerConfigured;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** With the platform's issuer configured, a paid order is watched until its invoice is accepted. */
@QuarkusTest
@TestProfile(BillingIssuerConfigured.class)
class BillingInvoiceAlertTest {

    @Inject
    OpsAlertChecks checks;

    @Inject
    PaymentSettlement settlement;

    @Inject
    WorkerFixtures fixtures;

    @Test
    void aPaidOrderWithoutItsInvoiceAcceptedIsReportedAfterAWhile() {
        BillingOrderEntity recent = paidOrder();
        BillingOrderEntity missing = paidOrder();
        BillingOrderEntity rejected = paidOrder();
        BillingOrderEntity accepted = paidOrder();
        UUID rejectedInvoice = fixtures.invoice();
        UUID acceptedInvoice = fixtures.invoice();
        QuarkusTransaction.requiringNew().run(() -> {
            DocumentEntity.<DocumentEntity>findById(rejectedInvoice).status = DocumentStatus.REJECTED;
            DocumentEntity.<DocumentEntity>findById(acceptedInvoice).status = DocumentStatus.ACCEPTED;
            BillingOrderEntity.<BillingOrderEntity>findById(rejected.id).invoiceDocumentId = rejectedInvoice;
            BillingOrderEntity.<BillingOrderEntity>findById(accepted.id).invoiceDocumentId = acceptedInvoice;
            for (BillingOrderEntity order : List.of(missing, rejected, accepted)) {
                BillingOrderEntity.<BillingOrderEntity>findById(order.id).paidAt =
                        OffsetDateTime.now().minusHours(3);
            }
        });

        List<String> keys = QuarkusTransaction.requiringNew()
                .call(() -> checks.billingInvoicesMissing().stream()
                        .map(OpsAlert::key)
                        .toList());

        assertThat(keys)
                .contains("billing_invoice_missing:" + missing.id, "billing_invoice_missing:" + rejected.id)
                .doesNotContain("billing_invoice_missing:" + recent.id, "billing_invoice_missing:" + accepted.id);
    }

    private BillingOrderEntity paidOrder() {
        UUID documentId = fixtures.invoice();
        UUID accountId = QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(documentId).accountId);
        BillingOrderEntity order = fixtures.planOrder(accountId, "EMPRENDEDOR");
        Instant now = Instant.now();
        assertThat(settlement.apply(new PaymentTransaction(
                        "12239576-" + order.id,
                        order.reference,
                        PaymentStatus.APPROVED,
                        order.totalCents,
                        "COP",
                        "CARD",
                        Optional.empty(),
                        now,
                        Optional.of(now),
                        "{}")))
                .isEqualTo(Outcome.PAID);
        return order;
    }
}
