package com.cantte.cetus.worker.billing;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.credits.Entitlements;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.notifications.Notifications;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * Once a day: expires the lots past their date, one account per transaction, and tells the billing contact of an
 * account with more production issuers than its products now include. Its issuers keep working; it only cannot
 * add more. Each step is idempotent, so replicas running it at once only repeat work.
 */
@ApplicationScoped
public class CreditUpkeep {

    private static final Logger LOG = Logger.getLogger(CreditUpkeep.class);

    @Inject
    EntityManager em;

    @Inject
    CreditLedger ledger;

    @Inject
    Entitlements entitlements;

    @Inject
    Notifications notifications;

    @Scheduled(
            cron = "${cetus.credits.daily-cron}",
            timeZone = "America/Bogota",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void daily() {
        OffsetDateTime now = OffsetDateTime.now();
        expire(now);
        issuersOverLimit(now);
    }

    /** @return how many lots expired */
    public int expire(OffsetDateTime now) {
        List<UUID> accounts = QuarkusTransaction.requiringNew()
                .call(() -> em.createNativeQuery("""
                                SELECT DISTINCT account_id FROM billing.credit_grants
                                WHERE status IN ('ACTIVE', 'EXHAUSTED') AND expires_at <= :now
                                """, UUID.class)
                        .setParameter("now", now)
                        .getResultList());
        int expired = 0;
        for (UUID account : accounts) {
            expired += QuarkusTransaction.requiringNew().call(() -> ledger.expire(account, now));
        }
        if (expired > 0) {
            LOG.infof("%d credit lots expired", expired);
        }
        return expired;
    }

    /** @return the accounts notified now; an account already told about the same limit is left out */
    public List<UUID> issuersOverLimit(OffsetDateTime now) {
        return QuarkusTransaction.requiringNew().call(() -> {
            @SuppressWarnings("unchecked")
            List<Object[]> rows = em.createNativeQuery("""
                            SELECT account_id, count(*) FROM billing.issuers
                            WHERE environment = :live GROUP BY account_id
                            """)
                    .setParameter("live", Environment.LIVE.name())
                    .getResultList();
            List<UUID> notified = new ArrayList<>();
            for (Object[] row : rows) {
                UUID account = (UUID) row[0];
                long issuers = ((Number) row[1]).longValue();
                int included = entitlements.of(account, now).issuersIncluded();
                if (issuers <= included) {
                    continue;
                }
                notifications
                        .request(
                                account,
                                NotificationKind.ISSUERS_OVER_LIMIT,
                                "issuers_over_limit:%s:%d".formatted(account, included),
                                Map.of("issuers", Long.toString(issuers), "included", Integer.toString(included)))
                        .ifPresent(notice -> notified.add(account));
            }
            return notified;
        });
    }
}
