package com.cantte.cetus.worker.ops;

import com.cantte.cetus.email.EmailException;
import com.cantte.cetus.email.EmailMessage;
import com.cantte.cetus.email.EmailSender;
import com.cantte.cetus.worker.ops.OpsAlert.Category;
import com.cantte.cetus.worker.support.EmailClients;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Emails the operators (CETUS_OPS_ALERT_EMAIL) about what needs a person: dead jobs and stuck documents
 * every few minutes; expiring certificates and ranges running out once a day. Each condition is sent
 * once and repeated at most once a day while it persists (see ops_alerts). Safe on many replicas: a run
 * holds a Postgres advisory lock, and a replica that does not get it skips the run.
 */
@ApplicationScoped
public class OpsAlerts {

    private static final Logger LOG = Logger.getLogger(OpsAlerts.class);
    /** Advisory lock id shared by every replica ("cetusops" in ASCII). */
    private static final long LOCK_ID = 0x6365747573_6f7073L;

    public enum Run {
        FREQUENT(EnumSet.of(Category.JOB_DEAD, Category.DOCUMENT_STUCK, Category.RANGE_UNVERIFIED)),
        DAILY(EnumSet.of(Category.CERTIFICATE_EXPIRING, Category.RANGE_RUNNING_OUT));

        final Set<Category> categories;

        Run(Set<Category> categories) {
            this.categories = categories;
        }
    }

    @Inject
    EntityManager em;
    @Inject
    OpsAlertChecks checks;
    @Inject
    EmailClients email;

    @ConfigProperty(name = "cetus.alerts.recipient")
    Optional<String> recipient;
    @ConfigProperty(name = "cetus.alerts.repeat-after")
    Duration repeatAfter;

    @Scheduled(every = "${cetus.alerts.check-interval}", delayed = "1m",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void frequent() {
        run(Run.FREQUENT);
    }

    @Scheduled(cron = "${cetus.alerts.daily-cron}", timeZone = "America/Bogota",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void daily() {
        run(Run.DAILY);
        deleteExpiredIdempotencyKeys();
    }

    /**
     * Checks the run's categories and emails what is new or due again.
     *
     * @return the alerts sent (or logged, without a recipient); empty when another replica holds the run
     */
    @Transactional
    public List<OpsAlert> run(Run run) {
        if (!Boolean.TRUE.equals(em.createNativeQuery("SELECT pg_try_advisory_xact_lock(:id)")
                .setParameter("id", LOCK_ID).getSingleResult())) {
            return List.of();
        }
        List<OpsAlert> current = new ArrayList<>();
        for (Category category : run.categories) {
            current.addAll(check(category));
        }
        // Known alert key -> whether its last email is older than repeat-after.
        Map<String, Boolean> known = known(run.categories);
        List<OpsAlert> due = current.stream()
                .filter(alert -> !known.containsKey(alert.key()) || alert.repeats() && known.get(alert.key()))
                .toList();

        forgetCleared(current.stream().map(OpsAlert::key).collect(Collectors.toSet()), known.keySet());
        for (OpsAlert alert : due) {
            em.createNativeQuery("""
                            INSERT INTO billing.ops_alerts (alert_key, category, summary)
                            VALUES (:key, :category, :summary)
                            ON CONFLICT (alert_key) DO UPDATE SET summary = excluded.summary, last_sent_at = now()
                            """)
                    .setParameter("key", alert.key())
                    .setParameter("category", alert.category().id())
                    .setParameter("summary", alert.summary())
                    .executeUpdate();
        }
        // Sent last: if the email fails the transaction rolls back and the next run tries again.
        notify(due);
        return due;
    }

    private List<OpsAlert> check(Category category) {
        return switch (category) {
            case JOB_DEAD -> checks.deadJobs();
            case DOCUMENT_STUCK -> checks.stuckDocuments();
            case RANGE_UNVERIFIED -> checks.unverifiedRanges();
            case CERTIFICATE_EXPIRING -> checks.expiringCertificates();
            case RANGE_RUNNING_OUT -> checks.rangesRunningOut();
        };
    }

    @SuppressWarnings("unchecked")
    private Map<String, Boolean> known(Set<Category> categories) {
        Map<String, Boolean> known = new HashMap<>();
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT alert_key, last_sent_at < :dueBefore
                        FROM billing.ops_alerts WHERE category IN (:categories)
                        """, Object[].class)
                .setParameter("dueBefore", OffsetDateTime.now().minus(repeatAfter))
                .setParameter("categories", categories.stream().map(Category::id).toList())
                .getResultList();
        for (Object[] row : rows) {
            known.put((String) row[0], (Boolean) row[1]);
        }
        return known;
    }

    /** A condition that cleared is forgotten, so it is reported again if it comes back. */
    private void forgetCleared(Set<String> current, Set<String> known) {
        List<String> cleared = known.stream().filter(key -> !current.contains(key)).toList();
        if (!cleared.isEmpty()) {
            em.createNativeQuery("DELETE FROM billing.ops_alerts WHERE alert_key IN (:keys)")
                    .setParameter("keys", cleared)
                    .executeUpdate();
        }
    }

    private void notify(List<OpsAlert> alerts) {
        if (alerts.isEmpty()) {
            return;
        }
        Optional<EmailSender> sender = email.sender();
        Optional<String> to = recipient.filter(r -> !r.isBlank());
        if (sender.isEmpty() || to.isEmpty()) {
            alerts.forEach(alert -> LOG.warnf("Ops alert (not emailed, no CETUS_OPS_ALERT_EMAIL or email delivery): %s",
                    alert.summary()));
            return;
        }
        String subject = alerts.size() == 1
                ? "[Cetus] " + alerts.get(0).summary()
                : "[Cetus] %d alertas operativas".formatted(alerts.size());
        String text = alerts.stream().map(alert -> "- " + alert.summary()).collect(Collectors.joining("\n"));
        String html = "<ul>" + alerts.stream().map(alert -> "<li>" + escape(alert.summary()) + "</li>")
                .collect(Collectors.joining()) + "</ul>";
        try {
            sender.get().send(new EmailMessage(email.from(), to.get(), null, shorten(subject), html, text, null),
                    "ops-alert-" + UUID.randomUUID());
        } catch (EmailException e) {
            LOG.errorf("Could not email %d ops alerts, retrying on the next run: %s", alerts.size(), e.getMessage());
            throw e;
        }
    }

    @Transactional
    void deleteExpiredIdempotencyKeys() {
        int deleted = em.createNativeQuery("DELETE FROM billing.idempotency_keys WHERE expires_at < now()").executeUpdate();
        LOG.debugf("Deleted %d expired idempotency keys", deleted);
    }

    private static String shorten(String subject) {
        return subject.length() > 150 ? subject.substring(0, 150) + "…" : subject;
    }

    private static String escape(String text) {
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
