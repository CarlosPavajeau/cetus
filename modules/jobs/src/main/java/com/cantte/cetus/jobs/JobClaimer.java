package com.cantte.cetus.jobs;

import com.cantte.cetus.persistence.entity.JobEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

/**
 * Claims ready jobs with FOR UPDATE SKIP LOCKED, so several workers never take the same job.
 * A RUNNING job whose lock expired (worker crashed) becomes claimable again.
 */
@ApplicationScoped
public class JobClaimer {

    @Inject
    EntityManager em;

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    @SuppressWarnings("unchecked")
    public List<JobEntity> claim(String workerId, int batchSize, Duration lease) {
        return em.createNativeQuery("""
                        UPDATE billing.jobs
                        SET status = 'RUNNING', attempts = attempts + 1, locked_by = :worker,
                            locked_until = now() + make_interval(secs => :lease), updated_at = now()
                        WHERE id IN (
                            SELECT id FROM billing.jobs
                            WHERE (status = 'PENDING' AND run_at <= now())
                               OR (status = 'RUNNING' AND locked_until < now())
                            ORDER BY run_at
                            LIMIT :limit
                            FOR UPDATE SKIP LOCKED)
                        RETURNING *
                        """, JobEntity.class)
                .setParameter("worker", workerId)
                .setParameter("lease", (double) lease.toSeconds())
                .setParameter("limit", batchSize)
                .getResultList();
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void done(UUID jobId) {
        em.createNativeQuery("UPDATE billing.jobs SET status = 'DONE', locked_until = NULL, updated_at = now() WHERE id = :id")
                .setParameter("id", jobId)
                .executeUpdate();
    }

    /** Schedules a retry with exponential backoff, or marks the job DEAD after max attempts. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void fail(JobEntity job, String error) {
        boolean dead = job.attempts >= job.maxAttempts;
        long backoffSeconds = Math.min(3600, (long) Math.pow(2, job.attempts) * 5);
        em.createNativeQuery("""
                        UPDATE billing.jobs
                        SET status = :status, last_error = :error, locked_until = NULL,
                            run_at = now() + make_interval(secs => :backoff), updated_at = now()
                        WHERE id = :id
                        """)
                .setParameter("status", dead ? "DEAD" : "PENDING")
                .setParameter("error", truncate(error))
                .setParameter("backoff", (double) backoffSeconds)
                .setParameter("id", job.id)
                .executeUpdate();
    }

    /** Marks the job DEAD without further attempts: retrying cannot fix the error. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void kill(UUID jobId, String error) {
        em.createNativeQuery("""
                        UPDATE billing.jobs
                        SET status = 'DEAD', last_error = :error, locked_until = NULL, updated_at = now()
                        WHERE id = :id
                        """)
                .setParameter("error", truncate(error))
                .setParameter("id", jobId)
                .executeUpdate();
    }

    /** Re-runs the job later without counting it as a failure (e.g. DIAN still processing). */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void reschedule(UUID jobId, Duration delay) {
        em.createNativeQuery("""
                        UPDATE billing.jobs
                        SET status = 'PENDING', attempts = attempts - 1, locked_until = NULL,
                            run_at = now() + make_interval(secs => :delay), updated_at = now()
                        WHERE id = :id
                        """)
                .setParameter("delay", (double) delay.toSeconds())
                .setParameter("id", jobId)
                .executeUpdate();
    }

    private static String truncate(String error) {
        if (error == null) {
            return null;
        }
        return error.length() > 2000 ? error.substring(0, 2000) : error;
    }
}
