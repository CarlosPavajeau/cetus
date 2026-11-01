package com.cantte.cetus.worker.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.credits.Entitlements;
import com.cantte.cetus.domain.billing.Consumption;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.payments.PaymentRejectedException;
import com.cantte.cetus.payments.PaymentStatus;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.persistence.entity.PaymentReversalEntity;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import com.cantte.cetus.worker.billing.PaymentSettlement.Outcome;
import com.cantte.cetus.worker.handlers.RefundOrderHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.FakeResendResource;
import com.cantte.cetus.worker.support.FakeWompi;
import com.cantte.cetus.worker.support.FakeWompiResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Money back from a paid order: its unused credits are revoked once, the order is REFUNDED when all of it went back,
 * a chargeback leaves what was used as a debt, and a Wompi refund is asked once.
 */
@QuarkusTest
@QuarkusTestResource(FakeWompiResource.class)
@QuarkusTestResource(FakeResendResource.class)
class ReversalsTest {

    @Inject
    WorkerFixtures fixtures;

    @Inject
    PaymentSettlement settlement;

    @Inject
    Reversals reversals;

    @Inject
    CreditLedger ledger;

    @Inject
    Entitlements entitlements;

    @Inject
    RefundOrderHandler refunds;

    @Inject
    PaymentReconciliation reconciliation;

    @Inject
    FakeWompi wompi;

    @BeforeEach
    void reset() {
        wompi.reset();
    }

    @Test
    void aPartialRefundRevokesTheUnusedCreditsAndLeavesTheOrderPaid() {
        UUID accountId = account();
        BillingOrderEntity order = paid(accountId, "EMPRENDEDOR");
        accept(accountId, 2);

        UUID reversal = register(order.id, PaymentReversalEntity.Kind.REFUND, 1_000_000);
        assertThat(reversals.apply(reversal)).isTrue();
        assertThat(reversals.apply(reversal)).isFalse();

        CreditGrantEntity lot = lotsOf(accountId).getFirst();
        assertThat(lot.status).isEqualTo(CreditGrantEntity.Status.REVOKED);
        assertThat(lot.remaining).isZero();
        assertThat(sumOfMovements(lot.id)).isZero();
        PaymentReversalEntity applied = reversalOf(reversal);
        assertThat(applied.status).isEqualTo(PaymentReversalEntity.Status.APPROVED);
        assertThat(applied.creditsRevoked).isEqualTo(lot.quantity - 2);
        assertThat(applied.debtOrderId).isNull();
        assertThat(orderOf(order.id).status).isEqualTo(BillingOrderEntity.Status.PAID);
        assertThat(notices(accountId, NotificationKind.ORDER_REFUNDED)).hasSize(1);
        assertThat(product(accountId)).isFalse();
    }

    @Test
    void aWholeRefundRefundsTheOrder() {
        UUID accountId = account();
        BillingOrderEntity order = paid(accountId, "EMPRENDEDOR");

        reversals.apply(register(order.id, PaymentReversalEntity.Kind.REFUND, order.totalCents));

        assertThat(orderOf(order.id).status).isEqualTo(BillingOrderEntity.Status.REFUNDED);
        assertThat(debtsOf(accountId)).isEmpty();
        assertThat(settlement.apply(transaction(order, PaymentStatus.APPROVED))).isEqualTo(Outcome.ALREADY_PAID);
        assertThat(orderOf(order.id).reviewReason).isNull();
    }

    @Test
    void aChargebackLeavesWhatTheDianAcceptedAsADebt() {
        UUID accountId = account();
        BillingOrderEntity order = paid(accountId, "EMPRENDEDOR");
        accept(accountId, 3);
        UUID waiting = fixtures.invoiceFor(accountId);
        QuarkusTransaction.requiringNew()
                .run(() -> ledger.reserve(accountId, waiting, DocumentType.INVOICE, OffsetDateTime.now()));
        int quantity = lotsOf(accountId).getFirst().quantity;

        UUID reversal = register(order.id, PaymentReversalEntity.Kind.CHARGEBACK, order.totalCents);
        reversals.apply(reversal);

        long debtCents = Consumption.valueCents(order.totalCents, 3, quantity);
        assertThat(reversalOf(reversal).debtCents).isEqualTo(debtCents);
        assertThat(orderOf(order.id).status).isEqualTo(BillingOrderEntity.Status.REFUNDED);
        assertThat(debtsOf(accountId)).singleElement().satisfies(debt -> {
            assertThat(debt.id).isEqualTo(reversalOf(reversal).debtOrderId);
            assertThat(debt.status).isEqualTo(BillingOrderEntity.Status.PENDING);
            assertThat(debt.expiresAt).isNull();
            assertThat(debt.totalCents).isEqualTo(debtCents);
            assertThat(itemsOf(debt.id))
                    .singleElement()
                    .satisfies(item -> assertThat(item.itemType).isEqualTo(BillingOrderItemEntity.Type.ADJUSTMENT));
        });
        assertThat(notices(accountId, NotificationKind.ACCOUNT_DEBT)).hasSize(1);
        assertThat(QuarkusTransaction.requiringNew().call(() -> BillingOrderEntity.hasDebt(accountId)))
                .isTrue();
    }

    @Test
    void aVoidOfASecondPaymentWaitsForAPersonWhileTheFirstStillPays() {
        UUID accountId = account();
        BillingOrderEntity order = paid(accountId, "EMPRENDEDOR");
        Instant now = Instant.now();
        PaymentTransaction second = new PaymentTransaction(
                "12239577-" + order.id,
                order.reference,
                PaymentStatus.APPROVED,
                order.totalCents,
                "COP",
                "CARD",
                Optional.empty(),
                now,
                Optional.of(now),
                "{}");
        settlement.apply(second);

        PaymentTransaction voided = new PaymentTransaction(
                second.id(),
                second.reference(),
                PaymentStatus.VOIDED,
                second.amountCents(),
                "COP",
                "CARD",
                Optional.empty(),
                now,
                Optional.of(now),
                "{}");
        assertThat(settlement.apply(voided)).isEqualTo(Outcome.REVIEW);

        assertThat(orderOf(order.id).status).isEqualTo(BillingOrderEntity.Status.PAID);
        assertThat(reversalsOf(order.id)).isEmpty();
        assertThat(lotsOf(accountId).getFirst().status).isEqualTo(CreditGrantEntity.Status.ACTIVE);
    }

    @Test
    void aPendingDebtIsCheckedWithWompiOnceADay() {
        UUID accountId = account();
        BillingOrderEntity order = paid(accountId, "EMPRENDEDOR");
        accept(accountId, 1);
        reversals.apply(register(order.id, PaymentReversalEntity.Kind.CHARGEBACK, order.totalCents));
        UUID debt = debtsOf(accountId).getFirst().id;

        assertThat(reconciliation.run()).contains(debt);
        assertThat(reconciliation.run()).doesNotContain(debt);
    }

    @Test
    void aVoidOfAPaidOrderIsAChargebackOnceAndNotAfterItsWholeRefund() {
        UUID accountId = account();
        BillingOrderEntity charged = paid(accountId, "EMPRENDEDOR");

        assertThat(settlement.apply(transaction(charged, PaymentStatus.VOIDED))).isEqualTo(Outcome.CHARGED_BACK);
        assertThat(settlement.apply(transaction(charged, PaymentStatus.VOIDED))).isEqualTo(Outcome.RECORDED);
        assertThat(reversalsOf(charged.id))
                .singleElement()
                .satisfies(reversal -> assertThat(reversal.kind).isEqualTo(PaymentReversalEntity.Kind.CHARGEBACK));

        BillingOrderEntity refunded = paid(account(), "EMPRENDEDOR");
        reversals.apply(register(refunded.id, PaymentReversalEntity.Kind.REFUND, refunded.totalCents));
        assertThat(settlement.apply(transaction(refunded, PaymentStatus.VOIDED)))
                .isEqualTo(Outcome.RECORDED);
        assertThat(reversalsOf(refunded.id)).hasSize(1);
    }

    @Test
    void aNewPaymentOfAChargedBackOrderWaitsForAPerson() {
        UUID accountId = account();
        BillingOrderEntity order = paid(accountId, "EMPRENDEDOR");
        settlement.apply(transaction(order, PaymentStatus.VOIDED));
        Instant now = Instant.now();
        PaymentTransaction another = new PaymentTransaction(
                "12239578-" + order.id,
                order.reference,
                PaymentStatus.APPROVED,
                order.totalCents,
                "COP",
                "CARD",
                Optional.empty(),
                now,
                Optional.of(now),
                "{}");

        assertThat(settlement.apply(another)).isEqualTo(Outcome.REVIEW);
        assertThat(orderOf(order.id).status).isEqualTo(BillingOrderEntity.Status.REFUNDED);
        assertThat(orderOf(order.id).reviewReason).contains(another.id());
    }

    @Test
    void aWholeRefundOfTheOpenPeriodEndsTheSubscriptionWithItsOverageAsADebt() {
        UUID accountId = account();
        BillingOrderEntity order = paid(accountId, "INICIAL");
        QuarkusTransaction.requiringNew().run(() -> {
            int left = CreditGrantEntity.listByAccount(accountId).getFirst().remaining;
            ledger.adjust(accountId, -left, null, admin(), "Sin créditos", OffsetDateTime.now());
        });
        accept(accountId, 2);

        reversals.apply(register(order.id, PaymentReversalEntity.Kind.REFUND, order.totalCents));

        SubscriptionEntity subscription = QuarkusTransaction.requiringNew()
                .call(() -> SubscriptionEntity.<SubscriptionEntity>find("accountId", accountId)
                        .firstResult());
        assertThat(subscription.status).isEqualTo(SubscriptionEntity.Status.CANCELED);
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_CANCELED))
                .singleElement()
                .satisfies(notice -> assertThat(notice.data).containsEntry("reason", "REFUNDED"));
        assertThat(lotsOf(accountId))
                .singleElement()
                .satisfies(lot -> assertThat(lot.status).isEqualTo(CreditGrantEntity.Status.REVOKED));
        assertThat(debtsOf(accountId)).singleElement().satisfies(debt -> {
            assertThat(debt.expiresAt).isNull();
            assertThat(itemsOf(debt.id)).singleElement().satisfies(item -> {
                assertThat(item.itemType).isEqualTo(BillingOrderItemEntity.Type.OVERAGE);
                assertThat(item.quantity).isEqualTo(2);
            });
        });
        assertThat(notices(accountId, NotificationKind.ACCOUNT_DEBT)).hasSize(1);
    }

    @Test
    void aWompiRefundIsAskedOnceAndItsApprovalApplied() {
        UUID accountId = account();
        BillingOrderEntity order = paid(accountId, "EMPRENDEDOR");
        UUID reversal = request(order.id, 500_000);

        refunds.handle(fixtures.pendingJob(JobTypes.REFUND_ORDER, reversal));
        refunds.handle(fixtures.pendingJob(JobTypes.REFUND_ORDER, reversal));

        assertThat(wompi.refunds()).singleElement().satisfies(asked -> {
            assertThat(asked.amountInCents()).isEqualTo(500_000);
            assertThat(asked.transactionId()).isEqualTo(transactionIdOf(order));
            assertThat(asked.reference()).isEqualTo(order.reference + "-R1");
        });
        PaymentReversalEntity approved = reversalOf(reversal);
        assertThat(approved.status).isEqualTo(PaymentReversalEntity.Status.APPROVED);
        assertThat(approved.providerRefundId).isEqualTo("1");
        assertThat(lotsOf(accountId).getFirst().status).isEqualTo(CreditGrantEntity.Status.REVOKED);
    }

    @Test
    void aRefundWompiTakesPendingIsFollowedUntilItIsDecided() {
        UUID accountId = account();
        BillingOrderEntity order = paid(accountId, "EMPRENDEDOR");
        UUID reversal = request(order.id, 500_000);
        wompi.refunding("PENDING");

        assertThatThrownBy(() -> refunds.handle(fixtures.pendingJob(JobTypes.REFUND_ORDER, reversal)))
                .isInstanceOfSatisfying(
                        RetryLater.class, retry -> assertThat(retry.delay()).isEqualTo(Duration.ofMinutes(1)));
        assertThat(reversalOf(reversal).status).isEqualTo(PaymentReversalEntity.Status.SUBMITTED);
        assertThat(reversalOf(reversal).providerRefundId).isEqualTo("1");
        requestedHoursAgo(reversal, 2);
        assertThatThrownBy(() -> refunds.handle(fixtures.pendingJob(JobTypes.REFUND_ORDER, reversal)))
                .isInstanceOfSatisfying(
                        RetryLater.class, retry -> assertThat(retry.delay()).isEqualTo(Duration.ofMinutes(30)));

        wompi.decideRefunds("APPROVED");
        refunds.handle(fixtures.pendingJob(JobTypes.REFUND_ORDER, reversal));

        assertThat(wompi.refunds()).hasSize(1);
        assertThat(reversalOf(reversal).status).isEqualTo(PaymentReversalEntity.Status.APPROVED);
        assertThat(lotsOf(accountId).getFirst().status).isEqualTo(CreditGrantEntity.Status.REVOKED);
    }

    @Test
    void aRefundWompiCannotDescribeIsRetriedWithBackoffAndOneItCannotReachIsFollowedLess() {
        UUID reversal = request(paid(account(), "EMPRENDEDOR").id, 500_000);
        wompi.refunding("PENDING");
        assertThatThrownBy(() -> refunds.handle(fixtures.pendingJob(JobTypes.REFUND_ORDER, reversal)))
                .isInstanceOf(RetryLater.class);

        wompi.garbling(true);
        assertThatThrownBy(() -> refunds.handle(fixtures.pendingJob(JobTypes.REFUND_ORDER, reversal)))
                .isInstanceOf(PaymentRejectedException.class);
        wompi.garbling(false);

        wompi.down(true);
        assertThatThrownBy(() -> refunds.handle(fixtures.pendingJob(JobTypes.REFUND_ORDER, reversal)))
                .isInstanceOfSatisfying(
                        RetryLater.class, retry -> assertThat(retry.delay()).isEqualTo(Duration.ofMinutes(1)));
        requestedHoursAgo(reversal, 2);
        assertThatThrownBy(() -> refunds.handle(fixtures.pendingJob(JobTypes.REFUND_ORDER, reversal)))
                .isInstanceOfSatisfying(
                        RetryLater.class, retry -> assertThat(retry.delay()).isEqualTo(Duration.ofMinutes(30)));

        assertThat(wompi.refunds()).hasSize(1);
        assertThat(reversalOf(reversal).status).isEqualTo(PaymentReversalEntity.Status.SUBMITTED);
    }

    @Test
    void aDeclinedWompiRefundFailsAndAnUnansweredOneWaitsForAPerson() {
        BillingOrderEntity declined = paid(account(), "EMPRENDEDOR");
        UUID first = request(declined.id, 500_000);
        wompi.refunding("DECLINED");
        refunds.handle(fixtures.pendingJob(JobTypes.REFUND_ORDER, first));

        assertThat(reversalOf(first).status).isEqualTo(PaymentReversalEntity.Status.FAILED);
        assertThat(reversalOf(first).failureMessage).isNotBlank();
        assertThat(orderOf(declined.id).status).isEqualTo(BillingOrderEntity.Status.PAID);

        UUID accountId = account();
        BillingOrderEntity unanswered = paid(accountId, "EMPRENDEDOR");
        UUID second = request(unanswered.id, 500_000);
        wompi.down(true);
        refunds.handle(fixtures.pendingJob(JobTypes.REFUND_ORDER, second));
        wompi.down(false);
        refunds.handle(fixtures.pendingJob(JobTypes.REFUND_ORDER, second));

        assertThat(wompi.refunds()).hasSize(1);
        assertThat(reversalOf(second).status).isEqualTo(PaymentReversalEntity.Status.SUBMITTED);
        assertThat(lotsOf(accountId).getFirst().status).isEqualTo(CreditGrantEntity.Status.ACTIVE);

        assertThat(reversals.apply(second)).isFalse();
        QuarkusTransaction.requiringNew().run(() -> {
            PaymentReversalEntity resolved = PaymentReversalEntity.findById(second);
            resolved.mode = PaymentReversalEntity.Mode.EXTERNAL;
            resolved.status = PaymentReversalEntity.Status.REQUESTED;
        });
        assertThat(reversals.apply(second)).isTrue();
        assertThat(reversalOf(second).status).isEqualTo(PaymentReversalEntity.Status.APPROVED);
    }

    private UUID account() {
        UUID accountId = QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(fixtures.invoice()).accountId);
        fixtures.billingProfile(accountId);
        return accountId;
    }

    private BillingOrderEntity paid(UUID accountId, String planCode) {
        BillingOrderEntity order = fixtures.planOrder(accountId, planCode);
        assertThat(settlement.apply(transaction(order, PaymentStatus.APPROVED))).isEqualTo(Outcome.PAID);
        return orderOf(order.id);
    }

    private void accept(UUID accountId, int count) {
        for (int i = 0; i < count; i++) {
            UUID document = fixtures.invoiceFor(accountId);
            QuarkusTransaction.requiringNew().run(() -> {
                OffsetDateTime now = OffsetDateTime.now();
                ledger.reserve(accountId, document, DocumentType.INVOICE, now);
                ledger.confirm(document, now);
            });
        }
    }

    /** A refund made elsewhere or a chargeback, as an admin registers it. */
    private static UUID register(UUID orderId, PaymentReversalEntity.Kind kind, long amountCents) {
        return QuarkusTransaction.requiringNew().call(() -> {
            BillingOrderEntity order = BillingOrderEntity.lock(orderId).orElseThrow();
            return PaymentReversalEntity.request(
                            order,
                            kind,
                            PaymentReversalEntity.Mode.EXTERNAL,
                            amountCents,
                            null,
                            admin(),
                            "Pedido por el cliente")
                    .id;
        });
    }

    /** A refund an admin asks Wompi for. */
    private static UUID request(UUID orderId, long amountCents) {
        return QuarkusTransaction.requiringNew().call(() -> {
            BillingOrderEntity order = BillingOrderEntity.lock(orderId).orElseThrow();
            return PaymentReversalEntity.request(
                            order,
                            PaymentReversalEntity.Kind.REFUND,
                            PaymentReversalEntity.Mode.WOMPI,
                            amountCents,
                            transactionIdOf(order),
                            admin(),
                            "Pedido por el cliente")
                    .id;
        });
    }

    private static Actor admin() {
        return new Actor(Actor.ActorType.PLATFORM, UUID.randomUUID().toString());
    }

    private static String transactionIdOf(BillingOrderEntity order) {
        return "12239576-" + order.id;
    }

    private static PaymentTransaction transaction(BillingOrderEntity order, PaymentStatus status) {
        Instant now = Instant.now();
        return new PaymentTransaction(
                transactionIdOf(order),
                order.reference,
                status,
                order.totalCents,
                "COP",
                "CARD",
                Optional.empty(),
                now,
                Optional.of(now),
                "{}");
    }

    private boolean product(UUID accountId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> entitlements.of(accountId, OffsetDateTime.now()).product());
    }

    private static BillingOrderEntity orderOf(UUID orderId) {
        return QuarkusTransaction.requiringNew().call(() -> BillingOrderEntity.findById(orderId));
    }

    private static void requestedHoursAgo(UUID reversalId, int hours) {
        QuarkusTransaction.requiringNew()
                .run(() -> PaymentReversalEntity.getEntityManager()
                        .createNativeQuery("UPDATE billing.payment_reversals SET created_at = now() - make_interval("
                                + "hours => :hours) WHERE id = :id")
                        .setParameter("hours", hours)
                        .setParameter("id", reversalId)
                        .executeUpdate());
    }

    private static PaymentReversalEntity reversalOf(UUID reversalId) {
        return QuarkusTransaction.requiringNew().call(() -> PaymentReversalEntity.findById(reversalId));
    }

    private static List<PaymentReversalEntity> reversalsOf(UUID orderId) {
        return QuarkusTransaction.requiringNew().call(() -> PaymentReversalEntity.listByOrder(orderId));
    }

    private static List<CreditGrantEntity> lotsOf(UUID accountId) {
        return QuarkusTransaction.requiringNew().call(() -> CreditGrantEntity.listByAccount(accountId));
    }

    private static List<BillingOrderEntity> debtsOf(UUID accountId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> BillingOrderEntity.<BillingOrderEntity>list(
                        "accountId = ?1 and kind = ?2", accountId, BillingOrderEntity.Kind.DEBT));
    }

    private static List<BillingOrderItemEntity> itemsOf(UUID orderId) {
        return QuarkusTransaction.requiringNew().call(() -> BillingOrderItemEntity.listByOrder(orderId));
    }

    private static List<NotificationEntity> notices(UUID accountId, NotificationKind kind) {
        return QuarkusTransaction.requiringNew()
                .call(() -> NotificationEntity.<NotificationEntity>list(
                        "accountId = ?1 and kind = ?2", accountId, kind.name()));
    }

    private static long sumOfMovements(UUID grantId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) CreditGrantEntity.getEntityManager()
                                .createNativeQuery(
                                        "SELECT sum(quantity) FROM billing.credit_movements WHERE grant_id = :id")
                                .setParameter("id", grantId)
                                .getSingleResult())
                        .longValue());
    }
}
