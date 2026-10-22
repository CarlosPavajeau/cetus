package com.cantte.cetus.jobs;

import com.cantte.cetus.persistence.entity.JobEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Claims ready jobs with FOR UPDATE SKIP LOCKED, so several workers never take the same job.
 * A RUNNING job whose lock expired (worker crashed) becomes claimable again. Locks taken on rows beyond
 * the total are released when the claim's transaction ends.
 */
@ApplicationScoped
public class JobClaimer {

    @Inject
    EntityManager em;

    /**
     * Claims up to {@code limits.get(type)} ready jobs of each type, oldest first, and at most {@code total}
     * in all. Types not in {@code limits} are not claimed.
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    @SuppressWarnings("unchecked")
    public List<JobEntity> claim(String workerId, Map<String, Integer> limits, int total, Duration lease) {
        List<Map.Entry<String, Integer>> wanted = limits.entrySet().stream().filter(e -> e.getValue() > 0).toList();
        if (wanted.isEmpty() || total <= 0) {
            return List.of();
        }
        // One row per type: (:type0, :limit0), (:type1, :limit1)...
        String values = IntStream.range(0, wanted.size())
                .mapToObj(i -> "(CAST(:type" + i + " AS text), CAST(:limit" + i + " AS int))")
                .collect(Collectors.joining(", "));
        Query query = em.createNativeQuery("""
                        UPDATE billing.jobs
                        SET status = 'RUNNING', attempts = attempts + 1, locked_by = :worker,
                            locked_until = now() + make_interval(secs => :lease), updated_at = now()
                        WHERE id IN (
                            SELECT ready.id
                            FROM (VALUES %s) AS limits(job_type, max_jobs)
                            CROSS JOIN LATERAL (
                                SELECT j.id, j.run_at FROM billing.jobs j
                                WHERE j.job_type = limits.job_type
                                  AND ((j.status = 'PENDING' AND j.run_at <= now())
                                    OR (j.status = 'RUNNING' AND j.locked_until < now()))
                                ORDER BY j.run_at
                                LIMIT limits.max_jobs
                                FOR UPDATE SKIP LOCKED) ready
                            ORDER BY ready.run_at
                            LIMIT :total)
                        RETURNING *
                        """.formatted(values), JobEntity.class)
                .setParameter("worker", workerId)
                .setParameter("lease", (double) lease.toSeconds())
                .setParameter("total", total);
        for (int i = 0; i < wanted.size(); i++) {
            query.setParameter("type" + i, wanted.get(i).getKey());
            query.setParameter("limit" + i, wanted.get(i).getValue());
        }
        return query.getResultList();
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void done(UUID jobId) {
        em.createNativeQuery("UPDATE billing.jobs SET status = 'DONE', locked_until = NULL, updated_at = now() WHERE id = :id")
                .setParameter("id", jobId)
                .executeUpdate();
    }

    /**
     * Schedules a retry with exponential backoff, or marks the job DEAD after max attempts.
     *
     * @return true if the job is now DEAD
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public boolean fail(JobEntity job, String error) {
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
        return dead;
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
