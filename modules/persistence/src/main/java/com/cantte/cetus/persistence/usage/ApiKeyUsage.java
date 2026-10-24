package com.cantte.cetus.persistence.usage;

import static com.cantte.cetus.persistence.NativeColumns.toOffsetDateTime;

import com.cantte.cetus.persistence.audit.RequestOrigin;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.hibernate.query.NativeQuery;

/** Requests made with each API key: written once per /v1 request, read by the console. */
@ApplicationScoped
public class ApiKeyUsage {

    public static final int MAX_RECENT = 50;

    @Inject
    EntityManager em;

    /** In its own transaction, so a request that fails and rolls back is still recorded. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void record(ApiKeyRequest request) {
        RequestOrigin from = request.origin() == null ? RequestOrigin.unknown() : request.origin();
        NativeQuery<?> insert = em.createNativeQuery("""
                        INSERT INTO billing.api_key_requests
                            (id, account_id, api_key_id, method, path, status, duration_ms, ip_address,
                             user_agent, created_at)
                        VALUES (:id, :account, :apiKey, :method, :path, :status, :duration, CAST(:ip AS inet),
                                :userAgent, :createdAt)
                        """).unwrap(NativeQuery.class);
        // Typed binding: an untyped null would be sent as bytea and break the cast.
        insert.setParameter("id", request.id(), UUID.class)
                .setParameter("account", request.accountId(), UUID.class)
                .setParameter("apiKey", request.apiKeyId(), UUID.class)
                .setParameter("method", request.method(), String.class)
                .setParameter("path", request.path(), String.class)
                .setParameter("status", request.status(), Integer.class)
                .setParameter("duration", request.durationMs(), Integer.class)
                .setParameter("ip", from.ipAddress(), String.class)
                .setParameter("userAgent", from.userAgent(), String.class)
                .setParameter("createdAt", request.createdAt(), OffsetDateTime.class)
                .executeUpdate();
    }

    /** Newest first. The account is checked too, so a key id of another account returns nothing. */
    public List<ApiKeyRequestView> recent(UUID accountId, UUID apiKeyId, int limit) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT id, method, path, status, duration_ms, created_at
                        FROM billing.api_key_requests
                        WHERE account_id = :account AND api_key_id = :apiKey
                        ORDER BY created_at DESC
                        LIMIT :limit
                        """)
                .setParameter("account", accountId)
                .setParameter("apiKey", apiKeyId)
                .setParameter("limit", Math.max(1, Math.min(limit, MAX_RECENT)))
                .getResultList();
        return rows.stream().map(ApiKeyUsage::toView).toList();
    }

    public long countSince(UUID accountId, UUID apiKeyId, OffsetDateTime since) {
        return ((Number) em.createNativeQuery("""
                        SELECT count(*)
                        FROM billing.api_key_requests
                        WHERE account_id = :account AND api_key_id = :apiKey AND created_at >= :since
                        """)
                        .setParameter("account", accountId)
                        .setParameter("apiKey", apiKeyId)
                        .setParameter("since", since)
                        .getSingleResult())
                .longValue();
    }

    private static ApiKeyRequestView toView(Object[] row) {
        return new ApiKeyRequestView(
                (UUID) row[0],
                (String) row[1],
                (String) row[2],
                ((Number) row[3]).intValue(),
                ((Number) row[4]).intValue(),
                toOffsetDateTime(row[5]));
    }
}
