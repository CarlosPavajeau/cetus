package com.cantte.cetus.worker.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.payments.PaymentStatus;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.payments.PaymentTransientException;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.PaymentTransactionEntity;
import com.cantte.cetus.worker.billing.PaymentSettlement.Outcome;
import com.cantte.cetus.worker.handlers.CheckPaymentHandler;
import com.cantte.cetus.worker.handlers.ProcessWebhookEventHandler;
import com.cantte.cetus.worker.ops.OpsAlerts;
import com.cantte.cetus.worker.support.FakeResend;
import com.cantte.cetus.worker.support.FakeResendResource;
import com.cantte.cetus.worker.support.FakeWompi;
import com.cantte.cetus.worker.support.FakeWompi.Transaction;
import com.cantte.cetus.worker.support.FakeWompiResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** A payment approved in Wompi pays its order exactly once, whether its event arrives, repeats or is lost. */
@QuarkusTest
@QuarkusTestResource(FakeWompiResource.class)
@QuarkusTestResource(FakeResendResource.class)
class PaymentSettlementTest {

    record EventTransaction(String id, String status) {}

    record EventData(EventTransaction transaction) {}

    record Event(String event, EventData data, String environment) {}

    @Inject
    PaymentSettlement settlement;

    @Inject
    ProcessWebhookEventHandler events;

    @Inject
    CheckPaymentHandler checks;

    @Inject
    PaymentReconciliation reconciliation;

    @Inject
    OpsAlerts alerts;

    @Inject
    WorkerFixtures fixtures;

    @Inject
    FakeWompi wompi;

    @Inject
    FakeResend resend;

    @Inject
    ObjectMapper json;

    @BeforeEach
    void reset() {
        wompi.reset();
        resend.reset();
    }

    @Test
    void anApprovedPaymentPaysTheOrderOnceEvenIfItsEventRepeats() throws Exception {
        BillingOrderEntity order =
                fixtures.order(2_490_000, OffsetDateTime.now().plusHours(1));
        String transactionId = newTransactionId();
        wompi.put(Transaction.of(transactionId, order.reference, "APPROVED", 2_490_000));

        Optional<UUID> first = receive(transactionId, "APPROVED");
        assertThat(receive(transactionId, "APPROVED")).isEmpty();
        events.handle(jobFor(first.orElseThrow()));
        events.handle(jobFor(first.get()));

        BillingOrderEntity paid = orderOf(order.id);
        assertThat(paid.status).isEqualTo(BillingOrderEntity.Status.PAID);
        assertThat(paid.paidAt).isNotNull();
        assertThat(eventOf(first.get()).status).isEqualTo(InboundWebhookEventEntity.Status.PROCESSED);
        assertThat(eventOf(first.get()).attempts).isEqualTo(1);
        assertThat(wompi.requests()).isEqualTo(1);
        assertThat(paidAudits(order.id)).isEqualTo(1);
        assertThat(settlement.apply(transaction(transactionId, order.reference, PaymentStatus.APPROVED, 2_490_000)))
                .isEqualTo(Outcome.ALREADY_PAID);
        assertThat(paidAudits(order.id)).isEqualTo(1);
    }

    @Test
    void anEventIsOnlyAHintAndWompiSaysWhatHappened() throws Exception {
        BillingOrderEntity order =
                fixtures.order(2_490_000, OffsetDateTime.now().plusHours(1));
        String transactionId = newTransactionId();
        wompi.put(Transaction.of(transactionId, order.reference, "DECLINED", 2_490_000));

        UUID event = receive(transactionId, "APPROVED").orElseThrow();
        events.handle(jobFor(event));

        assertThat(orderOf(order.id).status).isEqualTo(BillingOrderEntity.Status.PENDING);
        assertThat(transactionOf(transactionId).status).isEqualTo(PaymentTransactionEntity.Status.DECLINED);
    }

    @Test
    void aFinalStatusNeverGoesBack() {
        BillingOrderEntity order =
                fixtures.order(2_490_000, OffsetDateTime.now().plusHours(1));
        String transactionId = newTransactionId();

        assertThat(settlement.apply(transaction(transactionId, order.reference, PaymentStatus.APPROVED, 2_490_000)))
                .isEqualTo(Outcome.PAID);
        assertThat(settlement.apply(transaction(transactionId, order.reference, PaymentStatus.PENDING, 2_490_000)))
                .isEqualTo(Outcome.ALREADY_PAID);
        assertThat(settlement.apply(transaction(transactionId, order.reference, PaymentStatus.DECLINED, 2_490_000)))
                .isEqualTo(Outcome.ALREADY_PAID);

        assertThat(transactionOf(transactionId).status).isEqualTo(PaymentTransactionEntity.Status.APPROVED);
        assertThat(orderOf(order.id).status).isEqualTo(BillingOrderEntity.Status.PAID);

        assertThat(settlement.apply(transaction(transactionId, order.reference, PaymentStatus.VOIDED, 2_490_000)))
                .isEqualTo(Outcome.REVIEW);
        assertThat(transactionOf(transactionId).status).isEqualTo(PaymentTransactionEntity.Status.VOIDED);
        assertThat(orderOf(order.id).reviewReason).contains(transactionId);
    }

    @Test
    void aPaymentOfAnotherAmountWaitsForAPerson() {
        BillingOrderEntity order =
                fixtures.order(2_490_000, OffsetDateTime.now().plusHours(1));
        String transactionId = newTransactionId();

        assertThat(settlement.apply(transaction(transactionId, order.reference, PaymentStatus.APPROVED, 100)))
                .isEqualTo(Outcome.REVIEW);

        BillingOrderEntity reviewed = orderOf(order.id);
        assertThat(reviewed.status).isEqualTo(BillingOrderEntity.Status.PENDING);
        assertThat(reviewed.reviewReason).contains("pagó 100 COP").contains("vale 2490000 COP");
        assertThat(alerts.run(OpsAlerts.Run.FREQUENT))
                .anySatisfy(alert -> assertThat(alert.summary()).contains(order.reference));
        assertThat(alerts.run(OpsAlerts.Run.FREQUENT))
                .noneSatisfy(alert -> assertThat(alert.summary()).contains(order.reference));
    }

    @Test
    void anApprovalAfterTheOrderExpiredStillPaysIt() {
        BillingOrderEntity order =
                fixtures.order(2_490_000, OffsetDateTime.now().minusMinutes(5));
        QuarkusTransaction.requiringNew()
                .run(() -> BillingOrderEntity.<BillingOrderEntity>findById(order.id).status =
                        BillingOrderEntity.Status.EXPIRED);

        assertThat(settlement.apply(
                        transaction(newTransactionId(), order.reference, PaymentStatus.APPROVED, 2_490_000)))
                .isEqualTo(Outcome.PAID);
        assertThat(orderOf(order.id).status).isEqualTo(BillingOrderEntity.Status.PAID);
    }

    @Test
    void theWebhookAndTheReconciliationAtOnceStillPayOnce() throws Exception {
        BillingOrderEntity order =
                fixtures.order(2_490_000, OffsetDateTime.now().plusHours(1));
        PaymentTransaction approved =
                transaction(newTransactionId(), order.reference, PaymentStatus.APPROVED, 2_490_000);
        CountDownLatch start = new CountDownLatch(1);
        List<CompletableFuture<Outcome>> outcomes = new ArrayList<>();
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 4; i++) {
                outcomes.add(CompletableFuture.supplyAsync(
                        () -> {
                            try {
                                start.await();
                            } catch (InterruptedException e) {
                                throw new IllegalStateException(e);
                            }
                            return settlement.apply(approved);
                        },
                        pool));
            }
            start.countDown();
            List<Outcome> results = new ArrayList<>();
            for (CompletableFuture<Outcome> outcome : outcomes) {
                results.add(outcome.get(30, TimeUnit.SECONDS));
            }
            assertThat(results).containsOnlyOnce(Outcome.PAID).containsOnly(Outcome.PAID, Outcome.ALREADY_PAID);
        }
        assertThat(paidAudits(order.id)).isEqualTo(1);
    }

    @Test
    void aLostEventIsRecoveredByTheReconciliation() {
        BillingOrderEntity order =
                fixtures.order(2_490_000, OffsetDateTime.now().plusHours(1));
        BillingOrderEntity recent =
                fixtures.order(2_490_000, OffsetDateTime.now().plusHours(1));
        QuarkusTransaction.requiringNew()
                .run(() -> BillingOrderEntity.getEntityManager()
                        .createNativeQuery("UPDATE billing.billing_orders SET created_at = :at WHERE id = :id")
                        .setParameter("at", OffsetDateTime.now().minusMinutes(30))
                        .setParameter("id", order.id)
                        .executeUpdate());
        wompi.put(Transaction.of(newTransactionId(), order.reference, "DECLINED", 2_490_000));
        wompi.put(Transaction.of(newTransactionId(), order.reference, "APPROVED", 2_490_000));

        List<UUID> checked = reconciliation.run();
        assertThat(checked).contains(order.id).doesNotContain(recent.id);
        assertThat(reconciliation.run()).doesNotContain(order.id);

        checks.handle(checkJobOf(order.id));

        assertThat(orderOf(order.id).status).isEqualTo(BillingOrderEntity.Status.PAID);
        assertThat(QuarkusTransaction.requiringNew().call(() -> PaymentTransactionEntity.listByOrder(order.id)))
                .extracting(transaction -> transaction.status)
                .containsExactlyInAnyOrder(
                        PaymentTransactionEntity.Status.DECLINED, PaymentTransactionEntity.Status.APPROVED);
    }

    @Test
    void anEventOfNoOrderOrNoTransactionIsIgnored() throws Exception {
        String foreign = newTransactionId();
        wompi.put(Transaction.of(foreign, "OTRA-TIENDA-" + UUID.randomUUID(), "APPROVED", 100));

        UUID unknownOrder = receive(foreign, "APPROVED").orElseThrow();
        UUID unknownTransaction = receive(newTransactionId(), "APPROVED").orElseThrow();
        events.handle(jobFor(unknownOrder));
        events.handle(jobFor(unknownTransaction));

        assertThat(eventOf(unknownOrder).status).isEqualTo(InboundWebhookEventEntity.Status.IGNORED);
        assertThat(eventOf(unknownTransaction).status).isEqualTo(InboundWebhookEventEntity.Status.IGNORED);
    }

    @Test
    void aWompiOutageIsRetried() throws Exception {
        BillingOrderEntity order =
                fixtures.order(2_490_000, OffsetDateTime.now().plusHours(1));
        String transactionId = newTransactionId();
        wompi.put(Transaction.of(transactionId, order.reference, "APPROVED", 2_490_000));
        UUID event = receive(transactionId, "APPROVED").orElseThrow();
        wompi.down(true);

        assertThat(catchThrowable(() -> events.handle(jobFor(event)))).isInstanceOf(PaymentTransientException.class);
        assertThat(eventOf(event).status).isEqualTo(InboundWebhookEventEntity.Status.RECEIVED);

        wompi.down(false);
        events.handle(jobFor(event));
        assertThat(eventOf(event).attempts).isEqualTo(2);
        assertThat(orderOf(order.id).status).isEqualTo(BillingOrderEntity.Status.PAID);
    }

    /** Stores the event as the API does; empty when it was already received. */
    private Optional<UUID> receive(String transactionId, String status) throws Exception {
        String payload = json.writeValueAsString(
                new Event("transaction.updated", new EventData(new EventTransaction(transactionId, status)), "test"));
        return QuarkusTransaction.requiringNew()
                .call(() -> InboundWebhookEventEntity.record(
                        InboundWebhookEventEntity.Provider.WOMPI,
                        "transaction.updated:" + transactionId + ":" + status,
                        "transaction.updated",
                        payload));
    }

    private JobEntity jobFor(UUID eventId) {
        return fixtures.pendingJob(JobTypes.PROCESS_WEBHOOK_EVENT, eventId);
    }

    private static JobEntity checkJobOf(UUID orderId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> JobEntity.<JobEntity>find(
                                "jobType = ?1 and referenceId = ?2", JobTypes.CHECK_PAYMENT, orderId)
                        .singleResult());
    }

    private static PaymentTransaction transaction(String id, String reference, PaymentStatus status, long amount) {
        Instant now = Instant.now();
        return new PaymentTransaction(
                id,
                reference,
                status,
                amount,
                "COP",
                "CARD",
                Optional.empty(),
                now,
                status.isFinal() ? Optional.of(now) : Optional.empty(),
                "{}");
    }

    private static String newTransactionId() {
        return "12345-" + UUID.randomUUID();
    }

    private static BillingOrderEntity orderOf(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> BillingOrderEntity.findById(id));
    }

    private static InboundWebhookEventEntity eventOf(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> InboundWebhookEventEntity.findById(id));
    }

    private static PaymentTransactionEntity transactionOf(String providerId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> PaymentTransactionEntity.findByProviderId(
                                PaymentTransactionEntity.Provider.WOMPI, providerId)
                        .orElseThrow());
    }

    private static long paidAudits(UUID orderId) {
        return QuarkusTransaction.requiringNew().call(() -> (Long) BillingOrderEntity.getEntityManager()
                .createNativeQuery(
                        "SELECT count(*) FROM billing.audit_log WHERE action = 'BILLING_ORDER_PAID' AND resource_id = :id",
                        Long.class)
                .setParameter("id", orderId)
                .getSingleResult());
    }
}
