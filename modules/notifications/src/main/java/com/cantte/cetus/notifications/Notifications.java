package com.cantte.cetus.notifications;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.hibernate.query.NativeQuery;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Records a notice and enqueues its email in the caller's transaction: the notice exists if and only if
 * the fact it reports was committed. The dedup key names that fact, so reporting it again does nothing.
 */
@ApplicationScoped
public class Notifications {

    @Inject
    EntityManager em;
    @Inject
    JobQueue jobs;
    @Inject
    ObjectMapper mapper;

    /**
     * @param data what the email says (names, dates, links); never secrets
     * @return the new notice, or empty when the fact was already notified
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public Optional<UUID> request(UUID accountId, NotificationKind kind, String dedupKey, Map<String, String> data) {
        UUID id = Ids.newId();
        NativeQuery<?> insert = em.createNativeQuery("""
                        INSERT INTO billing.notification_log (id, account_id, kind, dedup_key, data)
                        VALUES (:id, :account, :kind, :key, CAST(:data AS jsonb))
                        ON CONFLICT (dedup_key) DO NOTHING
                        """)
                .unwrap(NativeQuery.class);
        int inserted = insert.setParameter("id", id, UUID.class)
                .setParameter("account", accountId, UUID.class)
                .setParameter("kind", kind.name(), String.class)
                .setParameter("key", dedupKey, String.class)
                .setParameter("data", json(data), String.class)
                .executeUpdate();
        if (inserted == 0) {
            return Optional.empty();
        }
        jobs.enqueue(JobTypes.SEND_NOTIFICATION, id);
        return Optional.of(id);
    }

    private String json(Map<String, String> data) {
        try {
            return mapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize the notification data", e);
        }
    }
}
