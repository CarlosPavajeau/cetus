package com.cantte.cetus.worker.ops;

import com.cantte.cetus.notifications.Notifications;
import com.cantte.cetus.worker.notifications.Dates;
import com.cantte.cetus.worker.ops.AccountHealthChecks.Notice;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.time.LocalDate;
import java.util.List;

/**
 * Once a day, tells each account's contacts what is about to stop their invoicing: certificates and
 * resolutions about to expire, ranges running out and a rise in DIAN rejections. It only records the
 * notices (SEND_NOTIFICATION emails them), each once per fact and threshold. Safe on many replicas: a run
 * holds a Postgres advisory lock, and a replica that does not get it skips the run.
 */
@ApplicationScoped
public class AccountHealth {

    private static final Logger LOG = Logger.getLogger(AccountHealth.class);
    /** Advisory lock id shared by every replica ("cetushlt" in ASCII). */
    private static final long LOCK_ID = 0x6365747573_686c74L;

    @Inject
    EntityManager em;
    @Inject
    AccountHealthChecks checks;
    @Inject
    Notifications notifications;

    @Scheduled(cron = "${cetus.account-health.cron}", timeZone = "America/Bogota",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void daily() {
        run(LocalDate.now(Dates.BOGOTA));
    }

    /** @return the notices requested now; facts already notified are left out */
    @Transactional
    public List<Notice> run(LocalDate today) {
        if (!Boolean.TRUE.equals(em.createNativeQuery("SELECT pg_try_advisory_xact_lock(:id)")
                .setParameter("id", LOCK_ID).getSingleResult())) {
            return List.of();
        }
        List<Notice> requested = checks.all(today).stream()
                .filter(notice -> notifications.request(notice.accountId(), notice.kind(), notice.dedupKey(),
                        notice.data()).isPresent())
                .toList();
        if (!requested.isEmpty()) {
            LOG.infof("Account health: %d new notices", requested.size());
        }
        return requested;
    }
}
