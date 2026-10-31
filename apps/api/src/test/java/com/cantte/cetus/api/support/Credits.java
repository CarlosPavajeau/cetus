package com.cantte.cetus.api.support;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import io.quarkus.arc.Arc;
import io.quarkus.arc.Unremovable;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Lots granted straight through the ledger, as a paid order or a promotion would. */
@Unremovable
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

    /**
     * Gives the console user's account a package, as production needs, unless it already has a lot: a CONTADOR
     * lot of 1000 documents and three production issuers for a year.
     */
    public static void ensurePackage(ConsoleUser user) {
        UUID accountId = UUID.fromString(user.request()
                .get("/console/account")
                .then()
                .statusCode(200)
                .extract()
                .path("id"));
        boolean granted =
                QuarkusTransaction.requiringNew().call(() -> CreditGrantEntity.count("accountId", accountId) > 0);
        if (!granted) {
            Arc.container()
                    .instance(Credits.class)
                    .get()
                    .grant(accountId, "CONTADOR", 1000, OffsetDateTime.now().plusYears(1));
        }
    }

    /** Ends the account's lots now, so it has no product nor credits. */
    public static void expireAll(UUID accountId) {
        QuarkusTransaction.requiringNew()
                .run(() -> CreditGrantEntity.update(
                        "expiresAt = ?1 where accountId = ?2",
                        OffsetDateTime.now().minusSeconds(1),
                        accountId));
    }
}
