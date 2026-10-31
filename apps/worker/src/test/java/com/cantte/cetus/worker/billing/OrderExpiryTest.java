package com.cantte.cetus.worker.billing;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class OrderExpiryTest {

    @Inject
    OrderExpiry expiry;

    @Inject
    WorkerFixtures fixtures;

    @Test
    void onlyUnpaidOrdersPastTheirExpiryExpire() {
        UUID past = fixtures.order(100, OffsetDateTime.now().minusMinutes(1)).id;
        UUID future = fixtures.order(100, OffsetDateTime.now().plusHours(1)).id;
        UUID paid = fixtures.order(100, OffsetDateTime.now().minusMinutes(1)).id;
        QuarkusTransaction.requiringNew().run(() -> {
            BillingOrderEntity order = BillingOrderEntity.findById(paid);
            order.status = BillingOrderEntity.Status.PAID;
            order.paidAt = OffsetDateTime.now().minusHours(2);
        });

        assertThat(expiry.run()).isPositive();
        assertThat(expiry.run()).isZero();

        assertThat(statusOf(past)).isEqualTo(BillingOrderEntity.Status.EXPIRED);
        assertThat(statusOf(future)).isEqualTo(BillingOrderEntity.Status.PENDING);
        assertThat(statusOf(paid)).isEqualTo(BillingOrderEntity.Status.PAID);
    }

    private static BillingOrderEntity.Status statusOf(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> BillingOrderEntity.<BillingOrderEntity>findById(id).status);
    }
}
