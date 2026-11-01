package com.cantte.cetus.worker.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.payments.PaymentStatus;
import com.cantte.cetus.payments.PaymentTransaction;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.persistence.entity.PaymentChargeEntity;
import com.cantte.cetus.persistence.entity.PaymentMethodEntity;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionPeriodEntity;
import com.cantte.cetus.worker.billing.PaymentSettlement.Outcome;
import com.cantte.cetus.worker.handlers.ChargeOrderHandler;
import com.cantte.cetus.worker.handlers.CheckPaymentHandler;
import com.cantte.cetus.worker.notifications.Dates;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.FakeResendResource;
import com.cantte.cetus.worker.support.FakeWompi;
import com.cantte.cetus.worker.support.FakeWompi.Transaction;
import com.cantte.cetus.worker.support.FakeWompiResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * A renewal charged to the saved card: once per attempt, retried on the retry days while it stays unpaid, with a
 * notice for each declined attempt, and never charged once the order is paid otherwise.
 */
@QuarkusTest
@QuarkusTestResource(FakeWompiResource.class)
@QuarkusTestResource(FakeResendResource.class)
class AutoChargeTest {

    @Inject
    WorkerFixtures fixtures;

    @Inject
    PaymentSettlement settlement;

    @Inject
    Subscriptions subscriptions;

    @Inject
    AutoCharge autoCharge;

    @Inject
    ChargeOrderHandler charges;

    @Inject
    CheckPaymentHandler checks;

    @Inject
    FakeWompi wompi;

    @BeforeEach
    void reset() {
        wompi.reset();
    }

    @Test
    void aRenewalIsChargedToTheCardOnceAndItsApprovalPaysIt() {
        UUID accountId = subscribed();
        PaymentMethodEntity card = fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);

        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_CHARGE_SCHEDULED))
                .singleElement()
                .satisfies(notice -> assertThat(notice.data).containsEntry("card", "VISA ••4242"));
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_RENEWAL)).isEmpty();
        PaymentChargeEntity first = chargesOf(renewal.id).getFirst();
        assertThat(first.origin).isEqualTo(PaymentChargeEntity.Origin.AUTO);
        assertThat(first.reference).isEqualTo(renewal.reference + "-1");

        JobEntity job = jobOf(first.id);
        charges.handle(job);
        charges.handle(job);

        assertThat(wompi.charges()).singleElement().satisfies(charge -> {
            assertThat(charge.reference()).isEqualTo(renewal.reference + "-1");
            assertThat(charge.amountInCents()).isEqualTo(renewal.totalCents);
            assertThat(charge.paymentSourceId()).isEqualTo(Long.parseLong(card.providerSourceId));
            assertThat(charge.customerEmail()).isEqualTo(card.customerEmail);
            assertThat(charge.acceptanceToken()).isEqualTo("eyJ.policy");
            assertThat(charge.recurrent()).isFalse();
        });
        PaymentChargeEntity submitted = chargesOf(renewal.id).getFirst();
        assertThat(submitted.status).isEqualTo(PaymentChargeEntity.Status.SUBMITTED);
        assertThat(submitted.providerTransactionId).isNotNull();

        wompi.put(Transaction.of(submitted.providerTransactionId, submitted.reference, "APPROVED", renewal.totalCents));
        checks.handle(fixtures.pendingJob(JobTypes.CHECK_PAYMENT, renewal.id));

        assertThat(orderOf(renewal.id).status).isEqualTo(BillingOrderEntity.Status.PAID);
        assertThat(chargesOf(renewal.id).getFirst().status).isEqualTo(PaymentChargeEntity.Status.APPROVED);
        assertThat(subscriptionOf(accountId).status).isEqualTo(SubscriptionEntity.Status.ACTIVE);
    }

    @Test
    void aDeclinedRenewalIsTriedAgainOnTheRetryDaysAndEachDeclineIsTold() {
        UUID accountId = subscribed();
        fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);
        OffsetDateTime closing = chargesOf(renewal.id).getFirst().runAt;

        for (int attempt = 1; attempt <= 4; attempt++) {
            decline(renewal.id);
        }

        assertThat(chargesOf(renewal.id))
                .extracting(charge -> charge.attempt, charge -> charge.status, charge -> charge.runAt.toInstant())
                .containsExactly(
                        tuple(1, PaymentChargeEntity.Status.FAILED, closing.toInstant()),
                        tuple(
                                2,
                                PaymentChargeEntity.Status.FAILED,
                                closing.plusDays(1).toInstant()),
                        tuple(
                                3,
                                PaymentChargeEntity.Status.FAILED,
                                closing.plusDays(3).toInstant()),
                        tuple(
                                4,
                                PaymentChargeEntity.Status.FAILED,
                                closing.plusDays(5).toInstant()));
        assertThat(chargesOf(renewal.id))
                .allSatisfy(charge -> assertThat(charge.failureMessage).isEqualTo("Fondos insuficientes"));
        List<NotificationEntity> failures = notices(accountId, NotificationKind.SUBSCRIPTION_CHARGE_FAILED);
        assertThat(failures).hasSize(4);
        assertThat(failures)
                .filteredOn(notice -> notice.data.get("retryAt").isEmpty())
                .hasSize(1);
        assertThat(orderOf(renewal.id).status).isEqualTo(BillingOrderEntity.Status.PENDING);

        UUID subscriptionId = subscriptionOf(accountId).id;
        remind(subscriptionId, closing.plusDays(5).plusHours(1));
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_PAST_DUE)).isEmpty();
        remind(subscriptionId, closing.plusDays(6).plusHours(1));
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_PAST_DUE)).hasSize(1);
    }

    @Test
    void noReminderGoesOutWhileAnAttemptWaits() {
        UUID accountId = subscribed();
        fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);
        OffsetDateTime closing = chargesOf(renewal.id).getFirst().runAt;
        decline(renewal.id);

        remind(subscriptionOf(accountId).id, closing.plusDays(3).plusHours(1));

        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_PAST_DUE)).isEmpty();
    }

    @Test
    void aRenewalPaidOtherwiseIsNotCharged() {
        UUID accountId = subscribed();
        fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);

        assertThat(settlement.apply(approved(renewal.reference, renewal.totalCents)))
                .isEqualTo(Outcome.PAID);
        PaymentChargeEntity first = chargesOf(renewal.id).getFirst();
        charges.handle(jobOf(first.id));

        assertThat(chargesOf(renewal.id).getFirst().status).isEqualTo(PaymentChargeEntity.Status.CANCELED);
        assertThat(wompi.charges()).isEmpty();
    }

    @Test
    void aDeclineOfARenewalPaidOtherwiseMeanwhileIsNotTold() {
        UUID accountId = subscribed();
        fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);
        charges.handle(jobOf(chargesOf(renewal.id).getFirst().id));

        assertThat(settlement.apply(approved(renewal.reference, renewal.totalCents)))
                .isEqualTo(Outcome.PAID);
        decline(chargesOf(renewal.id).getFirst());

        assertThat(chargesOf(renewal.id))
                .singleElement()
                .satisfies(charge -> assertThat(charge.status).isEqualTo(PaymentChargeEntity.Status.FAILED));
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_CHARGE_FAILED))
                .isEmpty();
    }

    @Test
    void anAttemptGivenUpOnIsApprovedWhenItsTransactionTurnsOutApproved() {
        UUID accountId = subscribed();
        fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);
        PaymentChargeEntity first = chargesOf(renewal.id).getFirst();
        charges.handle(jobOf(first.id));
        charges.onDead(jobOf(first.id), "Wompi kept failing");
        assertThat(chargesOf(renewal.id).getFirst().status).isEqualTo(PaymentChargeEntity.Status.FAILED);

        PaymentChargeEntity given = chargesOf(renewal.id).getFirst();
        assertThat(settlement.apply(approved(given.providerTransactionId, given.reference, renewal.totalCents)))
                .isEqualTo(Outcome.PAID);

        assertThat(chargesOf(renewal.id))
                .extracting(charge -> charge.status)
                .containsExactly(PaymentChargeEntity.Status.APPROVED, PaymentChargeEntity.Status.CANCELED);
    }

    @Test
    void aChargeWompiRefusesFailsAndIsTriedAgain() {
        UUID accountId = subscribed();
        fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);
        wompi.refusing(true);

        charges.handle(jobOf(chargesOf(renewal.id).getFirst().id));

        assertThat(chargesOf(renewal.id))
                .extracting(charge -> charge.status, charge -> charge.failureMessage)
                .containsExactly(
                        tuple(PaymentChargeEntity.Status.FAILED, AutoCharge.REFUSED),
                        tuple(PaymentChargeEntity.Status.SCHEDULED, null));
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_CHARGE_FAILED))
                .hasSize(1);
    }

    @Test
    void aChargeWhoseAnswerCannotBeReadIsFoundInsteadOfFailed() {
        UUID accountId = subscribed();
        fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);
        wompi.garbling(true);

        charges.handle(jobOf(chargesOf(renewal.id).getFirst().id));

        assertThat(wompi.charges()).hasSize(1);
        assertThat(chargesOf(renewal.id)).singleElement().satisfies(charge -> {
            assertThat(charge.status).isEqualTo(PaymentChargeEntity.Status.SUBMITTED);
            assertThat(charge.providerTransactionId).isNotNull();
        });
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_CHARGE_FAILED))
                .isEmpty();
    }

    @Test
    void whileWompiCannotSayWhetherItChargedTheAttemptWaitsAndIsNotChargedOnceTheOrderIsPaid() {
        UUID accountId = subscribed();
        fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);
        JobEntity job = jobOf(chargesOf(renewal.id).getFirst().id);
        wompi.down(true);

        assertThatThrownBy(() -> charges.handle(job)).isInstanceOf(RetryLater.class);
        assertThat(chargesOf(renewal.id).getFirst().status).isEqualTo(PaymentChargeEntity.Status.SUBMITTED);

        assertThat(settlement.apply(approved(renewal.reference, renewal.totalCents)))
                .isEqualTo(Outcome.PAID);
        wompi.down(false);
        charges.handle(job);

        assertThat(wompi.charges()).isEmpty();
        assertThat(chargesOf(renewal.id).getFirst().status).isEqualTo(PaymentChargeEntity.Status.CANCELED);
    }

    @Test
    void aVoidSeenBeforeItsApprovalFailsTheAttempt() {
        UUID accountId = subscribed();
        fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);
        charges.handle(jobOf(chargesOf(renewal.id).getFirst().id));
        PaymentChargeEntity submitted = chargesOf(renewal.id).getFirst();

        Instant now = Instant.now();
        settlement.apply(new PaymentTransaction(
                submitted.providerTransactionId,
                submitted.reference,
                PaymentStatus.VOIDED,
                renewal.totalCents,
                "COP",
                "CARD",
                Optional.empty(),
                now,
                Optional.of(now),
                "{}"));

        assertThat(chargesOf(renewal.id))
                .extracting(charge -> charge.status)
                .containsExactly(PaymentChargeEntity.Status.FAILED, PaymentChargeEntity.Status.SCHEDULED);
    }

    @Test
    void aRetryCanceledForWantOfACardDoesNotHoldBackItsDaysReminder() {
        UUID accountId = subscribed();
        PaymentMethodEntity card = fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);
        OffsetDateTime closing = chargesOf(renewal.id).getFirst().runAt;
        decline(renewal.id);
        decline(renewal.id);
        QuarkusTransaction.requiringNew().run(() -> {
            PaymentMethodEntity removed = PaymentMethodEntity.findById(card.id);
            removed.status = PaymentMethodEntity.Status.REMOVED;
            removed.removedAt = OffsetDateTime.now();
        });
        PaymentChargeEntity third = chargesOf(renewal.id).getLast();
        charges.handle(jobOf(third.id));
        assertThat(chargesOf(renewal.id).getLast().status).isEqualTo(PaymentChargeEntity.Status.CANCELED);

        remind(subscriptionOf(accountId).id, closing.plusDays(3).plusHours(1));

        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_PAST_DUE)).hasSize(1);
    }

    @Test
    void noReminderGoesOutWhileAChargeAskedForFromTheConsoleWaits() {
        UUID accountId = subscribed();
        PaymentMethodEntity card = fixtures.card(accountId, sourceId());
        QuarkusTransaction.requiringNew().run(() -> {
            PaymentMethodEntity removed = PaymentMethodEntity.findById(card.id);
            removed.status = PaymentMethodEntity.Status.REMOVED;
            removed.removedAt = OffsetDateTime.now();
        });
        BillingOrderEntity renewal = close(accountId);
        PaymentMethodEntity replacement = fixtures.card(accountId, sourceId());
        QuarkusTransaction.requiringNew()
                .run(() -> PaymentChargeEntity.schedule(
                        BillingOrderEntity.lock(renewal.id).orElseThrow(),
                        PaymentMethodEntity.findById(replacement.id),
                        PaymentChargeEntity.Origin.MANUAL,
                        OffsetDateTime.now()));

        remind(
                subscriptionOf(accountId).id,
                subscriptionOf(accountId).pastDueAt.plusDays(3).plusHours(1));

        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_PAST_DUE)).isEmpty();
    }

    @Test
    void anAttemptChargesTheCardThatReplacedTheOneItWasScheduledWith() {
        UUID accountId = subscribed();
        PaymentMethodEntity old = fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);
        QuarkusTransaction.requiringNew().run(() -> {
            PaymentMethodEntity removed = PaymentMethodEntity.findById(old.id);
            removed.status = PaymentMethodEntity.Status.REMOVED;
            removed.removedAt = OffsetDateTime.now();
        });
        PaymentMethodEntity replacement = fixtures.card(accountId, sourceId());

        charges.handle(jobOf(chargesOf(renewal.id).getFirst().id));

        assertThat(wompi.charges())
                .singleElement()
                .satisfies(charge ->
                        assertThat(charge.paymentSourceId()).isEqualTo(Long.parseLong(replacement.providerSourceId)));
        assertThat(chargesOf(renewal.id).getFirst().paymentMethodId).isEqualTo(replacement.id);
    }

    @Test
    void anAttemptWithoutACardIsCanceled() {
        UUID accountId = subscribed();
        PaymentMethodEntity card = fixtures.card(accountId, sourceId());
        BillingOrderEntity renewal = close(accountId);
        QuarkusTransaction.requiringNew().run(() -> {
            PaymentMethodEntity removed = PaymentMethodEntity.findById(card.id);
            removed.status = PaymentMethodEntity.Status.REMOVED;
            removed.removedAt = OffsetDateTime.now();
        });

        charges.handle(jobOf(chargesOf(renewal.id).getFirst().id));

        assertThat(chargesOf(renewal.id).getFirst().status).isEqualTo(PaymentChargeEntity.Status.CANCELED);
        assertThat(wompi.charges()).isEmpty();
    }

    @Test
    void aDeclinedChargeAskedForFromTheConsoleIsNotToldNorTriedAgain() {
        UUID accountId = subscribed();
        PaymentMethodEntity card = fixtures.card(accountId, sourceId());
        BillingOrderEntity order = fixtures.planOrder(accountId, "EMPRENDEDOR");
        UUID chargeId = QuarkusTransaction.requiringNew()
                .call(() -> PaymentChargeEntity.schedule(
                                BillingOrderEntity.lock(order.id).orElseThrow(),
                                PaymentMethodEntity.findById(card.id),
                                PaymentChargeEntity.Origin.MANUAL,
                                OffsetDateTime.now())
                        .id);

        charges.handle(fixtures.pendingJob(JobTypes.CHARGE_ORDER, chargeId));
        decline(chargesOf(order.id).getFirst());

        assertThat(chargesOf(order.id))
                .singleElement()
                .satisfies(charge -> assertThat(charge.status).isEqualTo(PaymentChargeEntity.Status.FAILED));
        assertThat(notices(accountId, NotificationKind.SUBSCRIPTION_CHARGE_FAILED))
                .isEmpty();
    }

    @Test
    void aCardAboutToExpireIsWarnedOfOnce() {
        UUID accountId = subscribed();
        PaymentMethodEntity card = fixtures.card(accountId, sourceId());
        // Already November in UTC, still October in Bogotá: the month that counts is Bogotá's.
        OffsetDateTime now = OffsetDateTime.parse("2026-11-01T02:56:00Z");
        YearMonth next = YearMonth.from(now.atZoneSameInstant(Dates.BOGOTA)).plusMonths(1);
        QuarkusTransaction.requiringNew().run(() -> {
            PaymentMethodEntity expiring = PaymentMethodEntity.findById(card.id);
            expiring.expYear = next.getYear();
            expiring.expMonth = next.getMonthValue();
        });

        QuarkusTransaction.requiringNew().call(() -> autoCharge.warnExpiring(now));
        QuarkusTransaction.requiringNew().call(() -> autoCharge.warnExpiring(now));

        assertThat(notices(accountId, NotificationKind.PAYMENT_METHOD_EXPIRING))
                .singleElement()
                .satisfies(notice -> assertThat(notice.data).containsEntry("expired", "false"));
    }

    /** Runs the order's waiting attempt and has Wompi decline it. */
    private void decline(UUID orderId) {
        PaymentChargeEntity live = chargesOf(orderId).stream()
                .filter(charge -> charge.status == PaymentChargeEntity.Status.SCHEDULED)
                .findFirst()
                .orElseThrow();
        charges.handle(jobOf(live.id));
        decline(chargesOf(orderId).stream()
                .filter(charge -> charge.id.equals(live.id))
                .findFirst()
                .orElseThrow());
    }

    private void decline(PaymentChargeEntity submitted) {
        Instant now = Instant.now();
        settlement.apply(new PaymentTransaction(
                submitted.providerTransactionId,
                submitted.reference,
                PaymentStatus.DECLINED,
                orderOf(submitted.orderId).totalCents,
                "COP",
                "CARD",
                Optional.of("Fondos insuficientes"),
                now,
                Optional.of(now),
                "{}"));
    }

    /** An account with a billing profile and a paid INICIAL subscription. */
    private UUID subscribed() {
        UUID accountId = QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(fixtures.invoice()).accountId);
        fixtures.billingProfile(accountId);
        BillingOrderEntity order = fixtures.planOrder(accountId, "INICIAL");
        assertThat(settlement.apply(approved(order.reference, order.totalCents)))
                .isEqualTo(Outcome.PAID);
        return accountId;
    }

    /** Closes the subscription's open period just after it ends; returns the renewal. */
    private BillingOrderEntity close(UUID accountId) {
        SubscriptionPeriodEntity period = QuarkusTransaction.requiringNew()
                .call(() -> SubscriptionPeriodEntity.findOpen(subscriptionOf(accountId).id)
                        .orElseThrow());
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() -> subscriptions.close(period.id, period.endsAt.plusMinutes(1))))
                .isTrue();
        return QuarkusTransaction.requiringNew()
                .call(() -> BillingOrderEntity.<BillingOrderEntity>find(
                                "accountId = ?1 and kind = ?2", accountId, BillingOrderEntity.Kind.RENEWAL)
                        .singleResult());
    }

    private void remind(UUID subscriptionId, OffsetDateTime at) {
        QuarkusTransaction.requiringNew().call(() -> subscriptions.remind(subscriptionId, at));
    }

    private static PaymentTransaction approved(String reference, long amount) {
        return approved("12239576-" + System.nanoTime() + "-1", reference, amount);
    }

    private static PaymentTransaction approved(String id, String reference, long amount) {
        Instant now = Instant.now();
        return new PaymentTransaction(
                id,
                reference,
                PaymentStatus.APPROVED,
                amount,
                "COP",
                "CARD",
                Optional.empty(),
                now,
                Optional.of(now),
                "{}");
    }

    private static String sourceId() {
        return Long.toString(System.nanoTime() % 1_000_000_000L);
    }

    private static JobEntity jobOf(UUID chargeId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> JobEntity.<JobEntity>find(
                                "jobType = ?1 and referenceId = ?2", JobTypes.CHARGE_ORDER, chargeId)
                        .singleResult());
    }

    private static List<PaymentChargeEntity> chargesOf(UUID orderId) {
        return QuarkusTransaction.requiringNew().call(() -> PaymentChargeEntity.listByOrder(orderId));
    }

    private static BillingOrderEntity orderOf(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> BillingOrderEntity.findById(id));
    }

    private static SubscriptionEntity subscriptionOf(UUID accountId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> SubscriptionEntity.<SubscriptionEntity>find("accountId", accountId)
                        .firstResult());
    }

    private static List<NotificationEntity> notices(UUID accountId, NotificationKind kind) {
        return QuarkusTransaction.requiringNew()
                .call(() -> NotificationEntity.<NotificationEntity>list(
                        "accountId = ?1 and kind = ?2", accountId, kind.name()));
    }
}
