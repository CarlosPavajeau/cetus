package com.cantte.cetus.persistence;

import com.cantte.cetus.domain.model.Environment;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Idempotency keys. {@link #begin} must run in the same transaction that creates the resource:
 * if that transaction rolls back, the key disappears with it and the client can retry.
 * A concurrent request with the same key blocks on the insert until the first one finishes. Keys are
 * scoped to an environment, so a key reused in production never replays a simulated or test document.
 */
@ApplicationScoped
public class IdempotencyStore {

    @Inject
    EntityManager em;

    public Outcome begin(UUID accountId, Environment environment, String key, String requestHash) {
        int inserted = em.createNativeQuery("""
                        INSERT INTO billing.idempotency_keys (account_id, environment, idem_key, request_hash, status)
                        VALUES (:account, :environment, :key, :hash, 'IN_PROGRESS')
                        ON CONFLICT (account_id, environment, idem_key) DO NOTHING
                        """)
                .setParameter("account", accountId)
                .setParameter("environment", environment.name())
                .setParameter("key", key)
                .setParameter("hash", requestHash)
                .executeUpdate();
        if (inserted == 1) {
            return Outcome.started();
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT request_hash, status, response_status, CAST(response_body AS text)
                        FROM billing.idempotency_keys
                        WHERE account_id = :account AND environment = :environment AND idem_key = :key
                        """)
                .setParameter("account", accountId)
                .setParameter("environment", environment.name())
                .setParameter("key", key)
                .getResultList();
        Object[] row = rows.get(0);
        if (!requestHash.equals(row[0])) {
            return new Outcome(State.MISMATCH, null, null);
        }
        if ("IN_PROGRESS".equals(row[1])) {
            return new Outcome(State.IN_PROGRESS, null, null);
        }
        return new Outcome(State.REPLAY, ((Number) row[2]).intValue(), (String) row[3]);
    }

    public void complete(UUID accountId, Environment environment, String key, int status, String responseJson) {
        em.createNativeQuery("""
                        UPDATE billing.idempotency_keys
                        SET status = 'COMPLETED', response_status = :status, response_body = CAST(:body AS jsonb)
                        WHERE account_id = :account AND environment = :environment AND idem_key = :key
                        """)
                .setParameter("status", status)
                .setParameter("body", responseJson)
                .setParameter("account", accountId)
                .setParameter("environment", environment.name())
                .setParameter("key", key)
                .executeUpdate();
    }

    public enum State {
        STARTED,
        IN_PROGRESS,
        REPLAY,
        MISMATCH
    }

    public record Outcome(State state, Integer responseStatus, String responseBody) {
        static Outcome started() {
            return new Outcome(State.STARTED, null, null);
        }

        public Optional<String> replayBody() {
            return Optional.ofNullable(responseBody);
        }
    }
}
