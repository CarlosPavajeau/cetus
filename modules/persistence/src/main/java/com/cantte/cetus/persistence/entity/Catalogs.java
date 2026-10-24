package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.Environment;
import io.quarkus.hibernate.orm.panache.Panache;
import jakarta.persistence.Query;
import java.util.List;
import java.util.UUID;

/** The list and search shared by the catalogs; see V23 for the indexes they rely on. */
final class Catalogs {

    private Catalogs() {}

    /**
     * Newest first, paginated by id (UUID v7). {@code searchText} is the expression of the table's trigram
     * index, so ILIKE over it uses the index; {@code text} is matched anywhere in it, its wildcards escaped.
     */
    @SuppressWarnings("unchecked")
    static <T> List<T> page(
            Class<T> entity,
            String table,
            String searchText,
            UUID accountId,
            Environment environment,
            String text,
            UUID beforeId,
            int limit) {
        StringBuilder sql = new StringBuilder("SELECT * FROM billing.")
                .append(table)
                .append(" WHERE account_id = :account AND environment = :environment");
        String search = text == null ? "" : text.strip();
        if (!search.isEmpty()) {
            sql.append(" AND ").append(searchText).append(" ILIKE :text");
        }
        if (beforeId != null) {
            sql.append(" AND id < :before");
        }
        sql.append(" ORDER BY id DESC LIMIT :limit");

        Query query = Panache.getEntityManager()
                .createNativeQuery(sql.toString(), entity)
                .setParameter("account", accountId)
                .setParameter("environment", environment.name())
                .setParameter("limit", limit);
        if (!search.isEmpty()) {
            query.setParameter(
                    "text",
                    "%" + search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        if (beforeId != null) {
            query.setParameter("before", beforeId);
        }
        return query.getResultList();
    }
}
