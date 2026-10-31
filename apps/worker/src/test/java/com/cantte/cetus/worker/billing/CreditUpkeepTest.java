package com.cantte.cetus.worker.billing;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.CreditMovementEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Lots past their date expire once, and an account above its included issuers is told once per limit. */
@QuarkusTest
class CreditUpkeepTest {

    @Inject
    WorkerFixtures fixtures;

    @Inject
    CreditUpkeep upkeep;

    @Inject
    CreditLedger ledger;

    @Test
    void aLotPastItsDateLosesWhatItHadLeftOnce() {
        UUID accountId = accountOf(fixtures.invoice());
        CreditGrantEntity lot = grant(accountId, "EMPRENDEDOR", 5);
        QuarkusTransaction.requiringNew()
                .run(() -> CreditGrantEntity.<CreditGrantEntity>findById(lot.id).expiresAt =
                        OffsetDateTime.now().minusMinutes(1));

        assertThat(upkeep.expire(OffsetDateTime.now())).isPositive();
        upkeep.expire(OffsetDateTime.now());

        CreditGrantEntity expired = QuarkusTransaction.requiringNew().call(() -> CreditGrantEntity.findById(lot.id));
        assertThat(expired.status).isEqualTo(CreditGrantEntity.Status.EXPIRED);
        assertThat(expired.remaining).isZero();
        List<CreditMovementEntity> movements = QuarkusTransaction.requiringNew()
                .call(() -> CreditMovementEntity.<CreditMovementEntity>list("grantId", lot.id));
        assertThat(movements)
                .filteredOn(movement -> movement.type == CreditMovementEntity.Type.EXPIRE)
                .singleElement()
                .satisfies(movement -> assertThat(movement.quantity).isEqualTo(-5));
    }

    @Test
    void anAccountAboveItsIncludedIssuersIsToldOnceAndKeepsThem() {
        UUID accountId = accountOf(fixtures.invoice());
        QuarkusTransaction.requiringNew()
                .run(() -> IssuerEntity.update("environment = ?1 where accountId = ?2", Environment.LIVE, accountId));

        assertThat(upkeep.issuersOverLimit(OffsetDateTime.now())).contains(accountId);
        assertThat(upkeep.issuersOverLimit(OffsetDateTime.now())).doesNotContain(accountId);

        grant(accountId, "EMPRENDEDOR", 300);
        assertThat(upkeep.issuersOverLimit(OffsetDateTime.now())).doesNotContain(accountId);
        assertThat(notices(accountId)).hasSize(1);
        assertThat(QuarkusTransaction.requiringNew()
                        .call(() -> IssuerEntity.count(
                                "accountId = ?1 and status <> ?2", accountId, IssuerEntity.Status.DISABLED)))
                .isEqualTo(1);
    }

    private CreditGrantEntity grant(UUID accountId, String planCode, int quantity) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ledger.grant(
                                accountId,
                                new CreditLedger.Source(CreditGrantEntity.SourceType.PROMO, Ids.newId()),
                                PlanVersionEntity.findCurrent(
                                                PlanEntity.byCode(planCode).id, null, OffsetDateTime.now())
                                        .orElseThrow()
                                        .id,
                                quantity,
                                OffsetDateTime.now().plusMonths(1),
                                Actor.system(),
                                null)
                        .orElseThrow());
    }

    private static UUID accountOf(UUID documentId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(documentId).accountId);
    }

    private static List<NotificationEntity> notices(UUID accountId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> NotificationEntity.<NotificationEntity>list(
                        "accountId = ?1 and kind = ?2", accountId, NotificationKind.ISSUERS_OVER_LIMIT.name()));
    }
}
