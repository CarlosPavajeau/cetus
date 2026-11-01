package com.cantte.cetus.worker.billing;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.CreditReservationEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.PaymentReversalEntity;
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
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Each approved reversal of an invoiced order is credited once over the invoice, once the invoice is accepted. */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
class BillingCreditNotesTest {

    @Inject
    BillingCreditNotes creditNotes;

    @Inject
    BillingInvoices invoices;

    @Inject
    Reversals reversals;

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
    void aWholeRefundCancelsTheInvoiceOnce() {
        BillingOrderEntity order = invoiced(true);
        UUID reversal = approved(order.id, order.totalCents);

        assertThat(BillingInvoicesTest.jobs(JobTypes.ISSUE_BILLING_CREDIT_NOTE, reversal))
                .hasSize(1);
        assertThat(creditNotes.issue(reversal)).isEqualTo(BillingCreditNotes.Outcome.ISSUED);
        assertThat(creditNotes.issue(reversal)).isEqualTo(BillingCreditNotes.Outcome.NOTHING);

        DocumentEntity note = document(reversalOf(reversal).creditNoteDocumentId);
        assertThat(note.documentType).isEqualTo(DocumentType.CREDIT_NOTE);
        assertThat(note.referencedDocumentId).isEqualTo(order.invoiceDocumentId);
        assertThat(note.correctionConcept).isEqualTo(CreditNoteConcept.CANCELLATION.name());
        assertThat(note.correctionDescription).contains(order.reference);
        assertThat(note.externalReference).isEqualTo(order.reference + "-R1");
        assertThat(note.payableAmount).isEqualByComparingTo(BigDecimal.valueOf(order.totalCents, 2));
        assertThat(note.lines)
                .singleElement()
                .satisfies(line -> assertThat(line.itemCode).isEqualTo("EMPRENDEDOR"));
        assertThat(BillingInvoicesTest.jobs(JobTypes.PROCESS_DOCUMENT, note.id)).hasSize(1);
        assertThat(QuarkusTransaction.requiringNew().call(() -> CreditReservationEntity.listByDocument(note.id)))
                .isEmpty();
    }

    @Test
    void aPartialRefundReturnsItsAmount() {
        BillingOrderEntity order = invoiced(true);
        UUID reversal = approved(order.id, 1_000_000);

        assertThat(creditNotes.issue(reversal)).isEqualTo(BillingCreditNotes.Outcome.ISSUED);

        DocumentEntity note = document(reversalOf(reversal).creditNoteDocumentId);
        assertThat(note.correctionConcept).isEqualTo(CreditNoteConcept.PARTIAL_RETURN.name());
        assertThat(note.payableAmount).isEqualByComparingTo(new BigDecimal("10000.00"));
        assertThat(note.lines)
                .singleElement()
                .satisfies(line -> assertThat(line.description).contains(order.reference));
    }

    @Test
    void aCreditNoteWaitsForTheInvoiceToBeAccepted() {
        BillingOrderEntity order = invoiced(false);
        UUID reversal = approved(order.id, order.totalCents);

        assertThat(creditNotes.issue(reversal)).isEqualTo(BillingCreditNotes.Outcome.INVOICE_PENDING);
        assertThat(reversalOf(reversal).creditNoteDocumentId).isNull();
    }

    @Test
    void anOrderWithoutInvoiceGetsNoCreditNote() {
        BillingOrderEntity order = paid();
        UUID reversal = approved(order.id, order.totalCents);

        assertThat(BillingInvoicesTest.jobs(JobTypes.ISSUE_BILLING_CREDIT_NOTE, reversal))
                .isEmpty();
        assertThat(creditNotes.issue(reversal)).isEqualTo(BillingCreditNotes.Outcome.NOTHING);
    }

    /** A paid order of a package invoiced by an issuer standing for Cetus' own, its invoice accepted or not. */
    private BillingOrderEntity invoiced(boolean accepted) {
        UUID issuerId = QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(fixtures.invoice()).issuerId);
        fixtures.creditNoteRange(issuerId);
        BillingOrderEntity order = paid();
        UUID invoiceId = invoices.issue(order.id, issuerId).orElseThrow().id;
        if (accepted) {
            dian.reply("SendBillSync", Reply.fixture("send-bill-sync-accepted.xml"));
            processor.handle(fixtures.job(invoiceId, 1));
            assertThat(document(invoiceId).status).isEqualTo(DocumentStatus.ACCEPTED);
        }
        return orderById(order.id);
    }

    private BillingOrderEntity paid() {
        UUID accountId = QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(fixtures.invoice()).accountId);
        BillingOrderEntity order = fixtures.planOrder(accountId, "EMPRENDEDOR");
        assertThat(settlement.apply(BillingInvoicesTest.approved(order))).isEqualTo(Outcome.PAID);
        return orderById(order.id);
    }

    /** A refund made elsewhere, registered and applied. */
    private UUID approved(UUID orderId, long amountCents) {
        UUID reversal = QuarkusTransaction.requiringNew().call(() -> {
            BillingOrderEntity order = BillingOrderEntity.lock(orderId).orElseThrow();
            return PaymentReversalEntity.request(
                            order,
                            PaymentReversalEntity.Kind.REFUND,
                            PaymentReversalEntity.Mode.EXTERNAL,
                            amountCents,
                            null,
                            new Actor(
                                    Actor.ActorType.PLATFORM, UUID.randomUUID().toString()),
                            "Pedido por el cliente")
                    .id;
        });
        assertThat(reversals.apply(reversal)).isTrue();
        return reversal;
    }

    private static PaymentReversalEntity reversalOf(UUID reversalId) {
        return QuarkusTransaction.requiringNew().call(() -> PaymentReversalEntity.findById(reversalId));
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
}
