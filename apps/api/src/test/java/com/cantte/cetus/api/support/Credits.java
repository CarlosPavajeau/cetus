package com.cantte.cetus.api.support;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Lots granted straight through the ledger, as a paid order or a promotion would. */
@ApplicationScoped
public class Credits {

    @Inject
    CreditLedger ledger;

    /** A promotional lot of the plan's current public version; returns the lot. */
    public CreditGrantEntity grant(UUID accountId, String planCode, int quantity, OffsetDateTime expiresAt) {
        return QuarkusTransaction.requiringNew().call(() -> {
            PlanVersionEntity version = PlanVersionEntity.findCurrent(
                            PlanEntity.byCode(planCode).id, null, OffsetDateTime.now())
                    .orElseThrow();
            return ledger.grant(
                            accountId,
                            new CreditLedger.Source(CreditGrantEntity.SourceType.PROMO, Ids.newId()),
                            version.id,
                            quantity,
                            expiresAt,
                            Actor.system(),
                            null)
                    .orElseThrow();
        });
    }
}
