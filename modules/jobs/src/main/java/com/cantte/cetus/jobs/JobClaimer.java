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
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Claims ready jobs with FOR UPDATE SKIP LOCKED, so several workers never take the same job.
 * A RUNNING job whose lock expired (worker crashed) becomes claimable again. Locks taken on rows beyond
 * the total are released when the claim's transaction ends.
 *
 * <p>Every claim stamps a new {@code claim_id}, and every later write requires it: a run that lost its lease
 * cannot finish, retry or revive a job another run now holds.
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
        List<Map.Entry<String, Integer>> wanted =
                limits.entrySet().stream().filter(e -> e.getValue() > 0).toList();
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
                            claim_id = gen_random_uuid(), locked_until = now() + make_interval(secs => :lease), updated_at = now()
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

    /** What became of a failed run. */
    public enum Failure {
        /** Pending again, after a backoff. */
        RETRY,
        /** Out of attempts. */
        DEAD,
        /** The run no longer held the job: its lease expired and another worker claimed it. Nothing changed. */
        LOST
    }

    /** @return false if the run no longer held the job, and nothing changed */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public boolean done(JobEntity job) {
        return em.createNativeQuery("""
                        UPDATE billing.jobs SET status = 'DONE', locked_until = NULL, updated_at = now()
                        WHERE id = :id AND status = 'RUNNING' AND claim_id = :claim
                        """)
                        .setParameter("id", job.id)
                        .setParameter("claim", job.claimId)
                        .executeUpdate()
                > 0;
    }

    /** Schedules a retry with exponential backoff, or marks the job DEAD once the row's attempts run out. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    @SuppressWarnings("unchecked")
    public Failure fail(JobEntity job, String error) {
        List<String> status = em.createNativeQuery("""
                        UPDATE billing.jobs
                        SET status = CASE WHEN attempts >= max_attempts THEN 'DEAD' ELSE 'PENDING' END,
                            last_error = :error, locked_until = NULL,
                            run_at = now() + make_interval(secs => least(3600, power(2, attempts) * 5)),
                            updated_at = now()
                        WHERE id = :id AND status = 'RUNNING' AND claim_id = :claim
                        RETURNING status
                        """)
                .setParameter("error", truncate(error))
                .setParameter("id", job.id)
                .setParameter("claim", job.claimId)
                .getResultList();
        if (status.isEmpty()) {
            return Failure.LOST;
        }
        return "DEAD".equals(status.getFirst()) ? Failure.DEAD : Failure.RETRY;
    }

    /**
     * Marks the job DEAD without further attempts: retrying cannot fix the error.
     *
     * @return false if the run no longer held the job, and nothing changed
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public boolean kill(JobEntity job, String error) {
        return em.createNativeQuery("""
                        UPDATE billing.jobs
                        SET status = 'DEAD', last_error = :error, locked_until = NULL, updated_at = now()
                        WHERE id = :id AND status = 'RUNNING' AND claim_id = :claim
                        """)
                        .setParameter("error", truncate(error))
                        .setParameter("id", job.id)
                        .setParameter("claim", job.claimId)
                        .executeUpdate()
                > 0;
    }

    /**
     * Re-runs the job later without counting it as a failure (e.g. DIAN still processing).
     *
     * @return false if the run no longer held the job, and nothing changed
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public boolean reschedule(JobEntity job, Duration delay) {
        return em.createNativeQuery("""
                        UPDATE billing.jobs
                        SET status = 'PENDING', attempts = attempts - 1, locked_until = NULL,
                            run_at = now() + make_interval(secs => :delay), updated_at = now()
                        WHERE id = :id AND status = 'RUNNING' AND claim_id = :claim
                        """)
                        .setParameter("delay", (double) delay.toSeconds())
                        .setParameter("id", job.id)
                        .setParameter("claim", job.claimId)
                        .executeUpdate()
                > 0;
    }

    /**
     * Pushes the lease of a running job forward, so a run slower than the lease is not claimed again.
     *
     * @return false if the run no longer held the job
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public boolean extend(JobEntity job, Duration lease) {
        return em.createNativeQuery("""
                        UPDATE billing.jobs SET locked_until = now() + make_interval(secs => :lease)
                        WHERE id = :id AND status = 'RUNNING' AND claim_id = :claim
                        """)
                        .setParameter("lease", (double) lease.toSeconds())
                        .setParameter("id", job.id)
                        .setParameter("claim", job.claimId)
                        .executeUpdate()
                > 0;
    }

    private static String truncate(String error) {
        if (error == null) {
            return null;
        }
        return error.length() > 2000 ? error.substring(0, 2000) : error;
    }
}
