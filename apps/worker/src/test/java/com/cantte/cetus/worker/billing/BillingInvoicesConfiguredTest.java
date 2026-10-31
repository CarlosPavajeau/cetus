package com.cantte.cetus.worker.billing;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.worker.billing.PaymentSettlement.Outcome;
import com.cantte.cetus.worker.support.BillingIssuerConfigured;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** With the platform's issuer configured, a paid order enqueues its invoice. */
@QuarkusTest
@TestProfile(BillingIssuerConfigured.class)
class BillingInvoicesConfiguredTest {

    @Inject
    PaymentSettlement settlement;

    @Inject
    WorkerFixtures fixtures;

    @Test
    void aPaidOrderEnqueuesItsInvoiceOnce() {
        BillingOrderEntity order = paidOrder();

        assertThat(settlement.apply(BillingInvoicesTest.approved(order))).isEqualTo(Outcome.ALREADY_PAID);
        assertThat(BillingInvoicesTest.jobs(JobTypes.ISSUE_BILLING_INVOICE, order.id))
                .hasSize(1);
    }

    private BillingOrderEntity paidOrder() {
        UUID documentId = fixtures.invoice();
        UUID accountId = QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(documentId).accountId);
        BillingOrderEntity order = fixtures.planOrder(accountId, "EMPRENDEDOR");
        assertThat(settlement.apply(BillingInvoicesTest.approved(order))).isEqualTo(Outcome.PAID);
        return order;
    }
}
