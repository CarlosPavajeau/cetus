package com.cantte.cetus.persistence.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;
import org.hibernate.query.NativeQuery;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Permanent record of who changed what on an account. Rows are written in the transaction of the
 * audited action, so a rollback discards them too; the table itself rejects UPDATE, DELETE and TRUNCATE.
 *
 * <p>{@code data} holds metadata only. Callers build the map explicitly and never put secrets in it
 * (PINs, technical keys, passwords, certificate content, API keys or their hashes).
 */
@ApplicationScoped
public class AuditLog {

    public static final int MAX_PAGE_SIZE = 100;

    private static final String SELECT_ALL = """
            SELECT id, account_id, action, actor_type, actor_id, impersonated_by, resource_type, resource_id,
                   CAST(data AS text), host(ip_address), created_at
            FROM billing.audit_log
            WHERE true
            """;
    private static final String SELECT = SELECT_ALL + " AND account_id = :account";

    private static final TypeReference<Map<String, Object>> DATA_TYPE = new TypeReference<>() {
    };

    @Inject
    EntityManager em;
    @Inject
    ObjectMapper mapper;

    @Transactional(Transactional.TxType.MANDATORY)
    public void record(UUID accountId, Actor actor, RequestOrigin origin, AuditAction action,
                       String resourceType, UUID resourceId, Map<String, Object> data) {
        Objects.requireNonNull(actor, "actor");
        Objects.requireNonNull(action, "action");
        RequestOrigin from = origin == null ? RequestOrigin.unknown() : origin;
        NativeQuery<?> insert = em.createNativeQuery("""
                        INSERT INTO billing.audit_log
                            (account_id, actor_type, actor_id, impersonated_by, action, resource_type, resource_id,
                             data, ip_address, user_agent)
                        VALUES (:account, :actorType, :actorId, :impersonatedBy, :action, :resourceType, :resourceId,
                                CAST(:data AS jsonb), CAST(:ip AS inet), :userAgent)
                        """)
                .unwrap(NativeQuery.class);
        // Typed binding: an untyped null would be sent as bytea and break the casts.
        insert.setParameter("account", accountId, UUID.class)
                .setParameter("actorType", actor.type().name(), String.class)
                .setParameter("actorId", actor.id(), String.class)
                .setParameter("impersonatedBy", actor.impersonatedBy(), String.class)
                .setParameter("action", action.name(), String.class)
                .setParameter("resourceType", resourceType, String.class)
                .setParameter("resourceId", resourceId, UUID.class)
                .setParameter("data", serialize(data), String.class)
                .setParameter("ip", from.ipAddress(), String.class)
                .setParameter("userAgent", from.userAgent(), String.class)
                .executeUpdate();
    }

    /** Newest first, paginated by id: pass the previous page's {@code nextCursor} as {@code beforeId}. */
    public AuditPage list(UUID accountId, AuditAction actionFilter, Long beforeId, int limit) {
        Objects.requireNonNull(accountId, "accountId");
        return page(new Filter(accountId, actionFilter, null), beforeId, limit);
    }

    /**
     * Across every account, for the Cetus team. Each filter is optional; {@code actorId} matches who acted
     * (a Better Auth user id, for USER and PLATFORM actors), impersonating someone or not.
     */
    public AuditPage listAll(UUID accountId, AuditAction actionFilter, String actorId, Long beforeId, int limit) {
        return page(new Filter(accountId, actionFilter, actorId), beforeId, limit);
    }

    private record Filter(UUID accountId, AuditAction action, String actorId) {
    }

    private AuditPage page(Filter filter, Long beforeId, int limit) {
        int size = Math.max(1, Math.min(limit, MAX_PAGE_SIZE));
        StringBuilder sql = new StringBuilder(filter.accountId() != null ? SELECT : SELECT_ALL);
        if (filter.action() != null) {
            sql.append(" AND action = :action");
        }
        if (filter.actorId() != null) {
            sql.append(" AND (actor_id = :actorId OR impersonated_by = :actorId)");
        }
        if (beforeId != null) {
            sql.append(" AND id < :before");
        }
        sql.append(" ORDER BY id DESC LIMIT :limit");

        // One extra row tells whether there is a next page.
        Query query = em.createNativeQuery(sql.toString()).setParameter("limit", size + 1);
        if (filter.accountId() != null) {
            query.setParameter("account", filter.accountId());
        }
        if (filter.action() != null) {
            query.setParameter("action", filter.action().name());
        }
        if (filter.actorId() != null) {
            query.setParameter("actorId", filter.actorId());
        }
        if (beforeId != null) {
            query.setParameter("before", beforeId);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<AuditEntryView> items = new ArrayList<>(Math.min(rows.size(), size));
        for (Object[] row : rows.subList(0, Math.min(rows.size(), size))) {
            items.add(toView(row));
        }
        Long nextCursor = rows.size() > size ? items.get(items.size() - 1).id() : null;
        return new AuditPage(items, nextCursor);
    }

    /** One entry of the account; empty when the id does not exist or belongs to another account. */
    public Optional<AuditEntryView> find(UUID accountId, long id) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(SELECT + " AND id = :id")
                .setParameter("account", accountId)
                .setParameter("id", id)
                .getResultList();
        return rows.stream().findFirst().map(this::toView);
    }

    private AuditEntryView toView(Object[] row) {
        return new AuditEntryView(
                ((Number) row[0]).longValue(),
                (UUID) row[1],
                AuditAction.valueOf((String) row[2]),
                Actor.ActorType.valueOf((String) row[3]),
                (String) row[4],
                (String) row[5],
                (String) row[6],
                (UUID) row[7],
                deserialize((String) row[8]),
                (String) row[9],
                toOffsetDateTime(row[10]));
    }

    private String serialize(Map<String, Object> data) {
        if (data == null) {
            return "{}";
        }
        try {
            return mapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Audit data is not serializable", e);
        }
    }

    private Map<String, Object> deserialize(String json) {
        try {
            return mapper.readValue(json, DATA_TYPE);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Corrupt audit data", e);
        }
    }

    private static OffsetDateTime toOffsetDateTime(Object value) {
        return switch (value) {
            case OffsetDateTime odt -> odt;
            case Instant instant -> instant.atOffset(ZoneOffset.UTC);
            case Timestamp timestamp -> timestamp.toInstant().atOffset(ZoneOffset.UTC);
            default -> throw new IllegalStateException("Unexpected timestamp type " + value.getClass());
        };
    }
}
