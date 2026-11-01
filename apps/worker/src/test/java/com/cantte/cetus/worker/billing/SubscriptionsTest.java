package com.cantte.cetus.worker.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.credits.Entitlements;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.payments.PaymentStatus;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.CreditMovementEntity;
import com.cantte.cetus.persistence.entity.CreditReservationEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionPeriodEntity;
import com.cantte.cetus.worker.billing.PaymentSettlement.Outcome;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

/**
 * A subscription from its first payment: each period closes once, billing its overage with the next month's fee,
 * and an unpaid renewal ends it after the grace. Each step runs at an instant past the period, which the scheduled
 * upkeep of the test never reaches.
 */
@QuarkusTest
class SubscriptionsTest {

    @Inject
    WorkerFixtures fixtures;

    @Inject
    PaymentSettlement settlement;

    @Inject
    Subscriptions subscriptions;

    @Inject
    CreditLedger ledger;

    @Inject
    Entitlements entitlements;

    @Test
    void anInicialWith260DocumentsRenewsFor48000OnceAndItsPaymentGrantsTheNextPeriod() {
        UUID accountId = subscribed("INICIAL");
        SubscriptionEntity subscription = subscriptionOf(accountId);
        SubscriptionPeriodEntity first = openPeriod(subscription.id);
        CreditGrantEntity lot = lotOf(first);
        assertThat(subscription.status).isEqualTo(SubscriptionEntity.Status.ACTIVE);
        assertThat(subscription.overageLimitCents).isEqualTo(11_700_000);
        assertThat(first.number).isEqualTo(1);
        assertThat(lot.quantity).isEqualTo(200);
        assertThat(lot.sourceType).isEqualTo(CreditGrantEntity.SourceType.SUBSCRIPTION_PERIOD);
        assertThat(lot.expiresAt.toInstant())
                .isEqualTo(first.endsAt.plusDays(60).toInstant());

        // The 200 documents of the month, then 60 more.
        QuarkusTransaction.requiringNew()
                .run(() -> ledger.adjust(accountId, -200, null, Actor.system(), "Consumo", OffsetDateTime.now()));
        List<UUID> overage = accepted(accountId, 60);
        assertThat(reservationsOf(overage)).allSatisfy(reservation -> {
            assertThat(reservation.kind).isEqualTo(CreditReservationEntity.Kind.OVERAGE);
            assertThat(reservation.subscriptionPeriodId).isEqualTo(first.id);
        });

        OffsetDateTime closing = first.endsAt.plusMinutes(1);
        assertThat(close(first.id, closing)).isTrue();
        assertThat(close(first.id, closing)).isFalse();

        SubscriptionPeriodEntity closed = periodOf(first.id);
        assertThat(closed.status).isEqualTo(SubscriptionPeriodEntity.Status.CLOSED);
        assertThat(closed.overageQuantity).isEqualTo(60);
        List<BillingOrderEntity> renewals = renewalsOf(accountId);
        assertThat(renewals).hasSize(1);
        BillingOrderEntity renewal = renewals.getFirst();
        assertThat(closed.closingOrderId).isEqualTo(renewal.id);
        assertThat(renewal.totalCents).isEqualTo(4_800_000);
        assertThat(renewal.status).isEqualTo(BillingOrderEntity.Status.PENDING);
        assertThat(itemsOf(renewal.id))
                .extracting(item -> item.itemType, item -> item.quantity, item -> item.totalCents)
                .containsExactlyInAnyOrder(
                        tuple(BillingOrderItemEntity.Type.PLAN, 1, 3_900_000L),
                        tuple(BillingOrderItemEntity.Type.OVERAGE, 60, 900_000L));
        assertThat(reservationsOf(overage))
                .allSatisfy(reservation -> assertThat(reservation.settled).isTrue());
        assertThat(movementsOf(accountId))
                .filteredOn(movement -> movement.type == CreditMovementEntity.Type.BILL_OVERAGE)
                .hasSize(60);
        SubscriptionPeriodEntity second = openPeriod(subscription.id);
        assertThat(second.number).isEqualTo(2);
        assertThat(second.openingOrderId).isEqualTo(renewal.id);
        assertThat(second.grantId).isNull();
        assertThat(subscriptionOf(accountId).status).isEqualTo(SubscriptionEntity.Status.PAST_DUE);
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_RENEWAL)).hasSize(1);

        assertThat(settlement.apply(approved(renewal))).isEqualTo(Outcome.PAID);
        assertThat(settlement.apply(approved(renewal))).isEqualTo(Outcome.ALREADY_PAID);

        assertThat(subscriptionOf(accountId).status).isEqualTo(SubscriptionEntity.Status.ACTIVE);
        CreditGrantEntity lotSecond = lotOf(openPeriod(subscription.id));
        assertThat(lotSecond.quantity).isEqualTo(200);
        assertThat(lotSecond.remaining).isEqualTo(200);
        assertThat(lotsOf(accountId)).hasSize(2);
    }

    @Test
    void anUnpaidRenewalIsRemindedAndCancelsTheSubscriptionAfterTheGrace() {
        UUID accountId = subscribed("INICIAL");
        SubscriptionEntity subscription = subscriptionOf(accountId);
        SubscriptionPeriodEntity first = openPeriod(subscription.id);
        OffsetDateTime closing = first.endsAt.plusMinutes(1);
        close(first.id, closing);
        SubscriptionPeriodEntity second = openPeriod(subscription.id);

        tend(subscription.id, closing.plusDays(2));
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_PAST_DUE)).isEmpty();
        tend(subscription.id, closing.plusDays(3));
        tend(subscription.id, closing.plusDays(3).plusHours(1));
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_PAST_DUE)).hasSize(1);
        assertThat(subscriptionOf(accountId).status).isEqualTo(SubscriptionEntity.Status.PAST_DUE);
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() ->
                                entitlements.of(accountId, OffsetDateTime.now()).product()))
                .isTrue();

        tend(subscription.id, closing.plusDays(6));
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_PAST_DUE)).hasSize(2);

        tend(subscription.id, closing.plusDays(7).plusMinutes(1));
        SubscriptionEntity canceled = QuarkusTransaction.requiringNew()
                .call(() -> SubscriptionEntity.<SubscriptionEntity>findById(subscription.id));
        assertThat(canceled.status).isEqualTo(SubscriptionEntity.Status.CANCELED);
        assertThat(canceled.pastDueAt).isNull();
        assertThat(periodOf(second.id).status).isEqualTo(SubscriptionPeriodEntity.Status.CLOSED);
        assertThat(periodOf(second.id).closingOrderId).isNull();
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_CANCELED)).hasSize(1);
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() ->
                                entitlements.of(accountId, OffsetDateTime.now()).product()))
                .isFalse();
        assertThat(renewalsOf(accountId)).hasSize(1);
    }

    @Test
    void theOverageOfAnUnpaidRenewalIsLeftAsADebtWhenTheSubscriptionLapses() {
        UUID accountId = subscribed("INICIAL");
        SubscriptionEntity subscription = subscriptionOf(accountId);
        QuarkusTransaction.requiringNew().run(() -> {
            int left = CreditGrantEntity.listByAccount(accountId).getFirst().remaining;
            ledger.adjust(
                    accountId,
                    -left,
                    null,
                    new Actor(Actor.ActorType.PLATFORM, UUID.randomUUID().toString()),
                    "Sin créditos",
                    OffsetDateTime.now());
        });
        accepted(accountId, 2);
        SubscriptionPeriodEntity first = openPeriod(subscription.id);
        OffsetDateTime closing = first.endsAt.plusMinutes(1);
        close(first.id, closing);

        tend(subscription.id, closing.plusDays(7).plusMinutes(1));

        List<BillingOrderEntity> debts = QuarkusTransaction.requiringNew()
                .call(() -> BillingOrderEntity.<BillingOrderEntity>list(
                        "accountId = ?1 and kind = ?2", accountId, BillingOrderEntity.Kind.DEBT));
        assertThat(debts).singleElement().satisfies(debt -> {
            assertThat(debt.expiresAt).isNull();
            assertThat(itemsOf(debt.id)).singleElement().satisfies(item -> {
                assertThat(item.itemType).isEqualTo(BillingOrderItemEntity.Type.OVERAGE);
                assertThat(item.quantity).isEqualTo(2);
                assertThat(item.subscriptionPeriodId).isEqualTo(first.id);
            });
        });
        assertThat(notices(accountId, NotificationKind.ACCOUNT_DEBT)).hasSize(1);
    }

    @Test
    void aPeriodThatEndsWithItsRenewalUnpaidEndsTheSubscriptionInsteadOfRenewingAgain() {
        UUID accountId = subscribed("INICIAL");
        SubscriptionEntity subscription = subscriptionOf(accountId);
        SubscriptionPeriodEntity first = openPeriod(subscription.id);
        close(first.id, first.endsAt.plusMinutes(1));
        OffsetDateTime pastDueAt = subscriptionOf(accountId).pastDueAt;
        SubscriptionPeriodEntity second = openPeriod(subscription.id);

        assertThat(close(second.id, second.endsAt.plusMinutes(1))).isTrue();

        SubscriptionEntity ended = QuarkusTransaction.requiringNew()
                .call(() -> SubscriptionEntity.<SubscriptionEntity>findById(subscription.id));
        assertThat(ended.status).isEqualTo(SubscriptionEntity.Status.CANCELED);
        assertThat(pastDueAt).isNotNull();
        assertThat(renewalsOf(accountId)).hasSize(1);
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_CANCELED))
                .singleElement()
                .satisfies(notice -> assertThat(notice.data).containsEntry("reason", "UNPAID"));
    }

    @Test
    void aRenewalPaidLatePaysWithItsLotTheOverageOfItsOwnPeriod() {
        UUID accountId = subscribed("INICIAL");
        SubscriptionEntity subscription = subscriptionOf(accountId);
        SubscriptionPeriodEntity first = openPeriod(subscription.id);
        QuarkusTransaction.requiringNew()
                .run(() -> ledger.adjust(accountId, -200, null, Actor.system(), "Consumo", OffsetDateTime.now()));
        close(first.id, first.endsAt.plusMinutes(1));
        SubscriptionPeriodEntity second = openPeriod(subscription.id);
        BillingOrderEntity renewal = renewalsOf(accountId).getFirst();
        assertThat(renewal.totalCents).isEqualTo(3_900_000);

        // Issued while the renewal is unpaid: overage of the new period.
        List<UUID> issued = accepted(accountId, 5);
        assertThat(reservationsOf(issued))
                .allSatisfy(reservation ->
                        assertThat(reservation.subscriptionPeriodId).isEqualTo(second.id));

        assertThat(settlement.apply(approved(renewal))).isEqualTo(Outcome.PAID);

        assertThat(lotOf(openPeriod(subscription.id)).remaining).isEqualTo(195);
        assertThat(reservationsOf(issued))
                .allSatisfy(reservation -> assertThat(reservation.settled).isTrue());
        close(second.id, second.endsAt.plusMinutes(1));
        assertThat(periodOf(second.id).overageQuantity).isZero();
        BillingOrderEntity next = renewalsOf(accountId).getLast();
        assertThat(itemsOf(next.id))
                .extracting(item -> item.itemType)
                .containsExactly(BillingOrderItemEntity.Type.PLAN);
    }

    @Test
    void unusedDocumentsCarryOverUpToTwoMonthlyQuotas() {
        UUID accountId = subscribed("INICIAL");
        SubscriptionEntity subscription = subscriptionOf(accountId);
        CreditGrantEntity firstLot = lotOf(openPeriod(subscription.id));

        for (int month = 0; month < 2; month++) {
            SubscriptionPeriodEntity open = openPeriod(subscription.id);
            close(open.id, open.endsAt.plusMinutes(1));
            assertThat(settlement.apply(approved(renewalsOf(accountId).getLast())))
                    .isEqualTo(Outcome.PAID);
        }

        assertThat(lotsOf(accountId)).hasSize(3);
        CreditGrantEntity capped =
                QuarkusTransaction.requiringNew().call(() -> CreditGrantEntity.findById(firstLot.id));
        assertThat(capped.remaining).isZero();
        assertThat(capped.status).isEqualTo(CreditGrantEntity.Status.EXHAUSTED);
        assertThat(lotsOf(accountId).stream().mapToInt(lot -> lot.remaining).sum())
                .isEqualTo(400);
    }

    @Test
    void theNextPeriodTakesTheScheduledPlanAndACancellationEndsItWithoutAnotherOrder() {
        UUID accountId = subscribed("INICIAL");
        SubscriptionEntity subscription = subscriptionOf(accountId);
        PlanVersionEntity crecimiento = QuarkusTransaction.requiringNew().call(() -> currentVersion("CRECIMIENTO"));
        QuarkusTransaction.requiringNew()
                .run(() -> SubscriptionEntity.<SubscriptionEntity>findById(subscription.id).nextPlanVersionId =
                        crecimiento.id);

        SubscriptionPeriodEntity first = openPeriod(subscription.id);
        close(first.id, first.endsAt.plusMinutes(1));
        SubscriptionPeriodEntity second = openPeriod(subscription.id);
        assertThat(second.planVersionId).isEqualTo(crecimiento.id);
        assertThat(renewalsOf(accountId).getFirst().totalCents).isEqualTo(14_900_000);
        SubscriptionEntity changed = subscriptionOf(accountId);
        assertThat(changed.planVersionId).isEqualTo(crecimiento.id);
        assertThat(changed.nextPlanVersionId).isNull();

        settlement.apply(approved(renewalsOf(accountId).getFirst()));
        assertThat(lotOf(openPeriod(subscription.id)).quantity).isEqualTo(2000);
        QuarkusTransaction.requiringNew()
                .run(() -> SubscriptionEntity.<SubscriptionEntity>findById(subscription.id).cancelAtPeriodEnd = true);

        close(second.id, second.endsAt.plusMinutes(1));

        assertThat(QuarkusTransaction.requiringNew()
                        .call(() -> SubscriptionEntity.<SubscriptionEntity>findById(subscription.id).status))
                .isEqualTo(SubscriptionEntity.Status.CANCELED);
        assertThat(renewalsOf(accountId)).hasSize(1);
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_CANCELED)).hasSize(1);
    }

    @Test
    void anOverageDocumentAcceptedAfterItsPeriodClosedIsBilledWithTheNext() {
        UUID accountId = subscribed("INICIAL");
        SubscriptionEntity subscription = subscriptionOf(accountId);
        SubscriptionPeriodEntity first = openPeriod(subscription.id);
        QuarkusTransaction.requiringNew()
                .run(() -> ledger.adjust(accountId, -200, null, Actor.system(), "Consumo", OffsetDateTime.now()));
        UUID late = fixtures.invoiceFor(accountId);
        QuarkusTransaction.requiringNew()
                .run(() -> ledger.reserve(accountId, late, DocumentType.INVOICE, OffsetDateTime.now()));

        close(first.id, first.endsAt.plusMinutes(1));
        assertThat(periodOf(first.id).overageQuantity).isZero();
        QuarkusTransaction.requiringNew().run(() -> ledger.confirm(late, OffsetDateTime.now()));

        SubscriptionPeriodEntity second = openPeriod(subscription.id);
        assertThat(reservationsOf(List.of(late)).getFirst().subscriptionPeriodId)
                .isEqualTo(second.id);
    }

    @Test
    void aSecondSubscriptionPaidForTheSameAccountIsLeftForReview() {
        UUID accountId = subscribed("INICIAL");
        BillingOrderEntity another = fixtures.planOrder(accountId, "ESCALA");

        assertThat(settlement.apply(approved(another))).isEqualTo(Outcome.PAID);

        assertThat(QuarkusTransaction.requiringNew()
                        .call(() -> BillingOrderEntity.<BillingOrderEntity>findById(another.id).reviewReason))
                .contains("ya tenía una suscripción");
        assertThat(subscriptionOf(accountId).planVersionId)
                .isEqualTo(QuarkusTransaction.requiringNew().call(() -> currentVersion("INICIAL").id));
    }

    @Test
    void twoSubscriptionsPaidAtOnceStartOneAndLeaveTheOtherForReview() throws Exception {
        UUID accountId = QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(fixtures.invoice()).accountId);
        fixtures.billingProfile(accountId);
        BillingOrderEntity first = fixtures.planOrder(accountId, "INICIAL");
        BillingOrderEntity second = fixtures.planOrder(accountId, "CRECIMIENTO");

        CompletableFuture<Outcome> one = CompletableFuture.supplyAsync(() -> settlement.apply(approved(first)));
        CompletableFuture<Outcome> other = CompletableFuture.supplyAsync(() -> settlement.apply(approved(second)));

        assertThat(List.of(one.get(30, TimeUnit.SECONDS), other.get(30, TimeUnit.SECONDS)))
                .containsOnly(Outcome.PAID);
        assertThat(QuarkusTransaction.requiringNew().call(() -> SubscriptionEntity.count("accountId", accountId)))
                .isEqualTo(1);
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() ->
                                BillingOrderEntity.<BillingOrderEntity>list("id in ?1", List.of(first.id, second.id))))
                .filteredOn(order -> order.reviewReason != null)
                .singleElement()
                .satisfies(order -> assertThat(order.reviewReason).contains("ya tenía una suscripción"));
    }

    /** An account with a billing profile whose order of the plan was just paid. */
    private UUID subscribed(String planCode) {
        UUID accountId = QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(fixtures.invoice()).accountId);
        fixtures.billingProfile(accountId);
        BillingOrderEntity order = fixtures.planOrder(accountId, planCode);
        assertThat(settlement.apply(approved(order))).isEqualTo(Outcome.PAID);
        return accountId;
    }

    /**
     * What the upkeep does to one period at the instant; the upkeep itself would also close the periods of the other
     * tests.
     */
    private boolean close(UUID periodId, OffsetDateTime at) {
        return QuarkusTransaction.requiringNew().call(() -> subscriptions.close(periodId, at));
    }

    /** What the upkeep does to one past due subscription at the instant. */
    private void tend(UUID subscriptionId, OffsetDateTime at) {
        if (!QuarkusTransaction.requiringNew().call(() -> subscriptions.lapse(subscriptionId, at))) {
            QuarkusTransaction.requiringNew().call(() -> subscriptions.remind(subscriptionId, at));
        }
    }

    /** Documents of the account reserved and accepted now. */
    private List<UUID> accepted(UUID accountId, int count) {
        List<UUID> documents = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            UUID document = fixtures.invoiceFor(accountId);
            QuarkusTransaction.requiringNew().run(() -> {
                OffsetDateTime now = OffsetDateTime.now();
                ledger.reserve(accountId, document, DocumentType.INVOICE, now);
                ledger.confirm(document, now);
            });
            documents.add(document);
        }
        return documents;
    }

    private static PaymentTransaction approved(BillingOrderEntity order) {
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

    private static PlanVersionEntity currentVersion(String planCode) {
        return PlanVersionEntity.findCurrent(PlanEntity.byCode(planCode).id, null, OffsetDateTime.now())
                .orElseThrow();
    }

    private static SubscriptionEntity subscriptionOf(UUID accountId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> SubscriptionEntity.<SubscriptionEntity>find("accountId", accountId)
                        .firstResult());
    }

    private static SubscriptionPeriodEntity openPeriod(UUID subscriptionId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> SubscriptionPeriodEntity.findOpen(subscriptionId).orElseThrow());
    }

    private static SubscriptionPeriodEntity periodOf(UUID periodId) {
        return QuarkusTransaction.requiringNew().call(() -> SubscriptionPeriodEntity.findById(periodId));
    }

    private static CreditGrantEntity lotOf(SubscriptionPeriodEntity period) {
        return QuarkusTransaction.requiringNew().call(() -> CreditGrantEntity.findById(period.grantId));
    }

    private static List<CreditGrantEntity> lotsOf(UUID accountId) {
        return QuarkusTransaction.requiringNew().call(() -> CreditGrantEntity.listByAccount(accountId));
    }

    private static List<BillingOrderEntity> renewalsOf(UUID accountId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> BillingOrderEntity.<BillingOrderEntity>list(
                        "accountId = ?1 and kind = ?2 order by createdAt, id",
                        accountId,
                        BillingOrderEntity.Kind.RENEWAL));
    }

    private static List<BillingOrderItemEntity> itemsOf(UUID orderId) {
        return QuarkusTransaction.requiringNew().call(() -> BillingOrderItemEntity.listByOrder(orderId));
    }

    private static List<CreditReservationEntity> reservationsOf(List<UUID> documents) {
        return QuarkusTransaction.requiringNew()
                .call(() -> documents.stream()
                        .map(document ->
                                CreditReservationEntity.listByDocument(document).getFirst())
                        .toList());
    }

    private static List<CreditMovementEntity> movementsOf(UUID accountId) {
        return QuarkusTransaction.requiringNew().call(() -> CreditMovementEntity.listByAccount(accountId, 500));
    }

    private static List<NotificationEntity> notices(UUID accountId, NotificationKind kind) {
        return QuarkusTransaction.requiringNew()
                .call(() -> NotificationEntity.<NotificationEntity>list(
                        "accountId = ?1 and kind = ?2", accountId, kind.name()));
    }
}
