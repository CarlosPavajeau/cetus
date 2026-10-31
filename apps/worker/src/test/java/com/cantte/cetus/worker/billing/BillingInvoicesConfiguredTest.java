package com.cantte.cetus.worker.billing;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.billing.PaymentSettlement.Outcome;
import com.cantte.cetus.worker.support.BillingIssuerConfigured;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** With the platform's issuer configured, a paid order enqueues its invoice, and one that never did gets it. */
@QuarkusTest
@TestProfile(BillingIssuerConfigured.class)
class BillingInvoicesConfiguredTest {

    @Inject
    PaymentSettlement settlement;

    @Inject
    WorkerFixtures fixtures;

    @Inject
    OrderInvoice orderInvoice;

    @Test
    void aPaidOrderEnqueuesItsInvoiceOnce() {
        BillingOrderEntity order = paidOrder();

        assertThat(settlement.apply(BillingInvoicesTest.approved(order))).isEqualTo(Outcome.ALREADY_PAID);
        assertThat(BillingInvoicesTest.jobs(JobTypes.ISSUE_BILLING_INVOICE, order.id))
                .hasSize(1);
    }

    @Test
    void aPaidOrderThatNeverHadItsInvoiceEnqueuedGetsItOnce() {
        BillingOrderEntity order = paidOrder();
        QuarkusTransaction.requiringNew()
                .run(() -> JobEntity.delete(
                        "jobType = ?1 and referenceId = ?2", JobTypes.ISSUE_BILLING_INVOICE, order.id));

        assertThat(orderInvoice.sweep()).contains(order.id);
        assertThat(orderInvoice.sweep()).doesNotContain(order.id);
        assertThat(BillingInvoicesTest.jobs(JobTypes.ISSUE_BILLING_INVOICE, order.id))
                .hasSize(1);
    }

    @Test
    void anOrderWhoseInvoiceJobDiedIsNotEnqueuedAgain() {
        BillingOrderEntity order = paidOrder();
        QuarkusTransaction.requiringNew()
                .run(() -> JobEntity.update(
                        "status = 'DEAD' where jobType = ?1 and referenceId = ?2",
                        JobTypes.ISSUE_BILLING_INVOICE,
                        order.id));

        assertThat(orderInvoice.sweep()).doesNotContain(order.id);
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
