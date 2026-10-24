package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.LineInput;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A product or service saved in an account's catalog for one environment; see V22. */
@Entity
@Table(name = "products")
public class ProductEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    @Column(name = "account_id")
    public UUID accountId;

    @Enumerated(EnumType.STRING)
    public Environment environment;

    public String code;

    public String description;

    @Column(name = "unit_code")
    public String unitCode;

    @Column(name = "unit_price")
    public BigDecimal unitPrice;

    @JdbcTypeCode(SqlTypes.JSON)
    public List<LineInput.LineTax> taxes = new ArrayList<>();

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public static Optional<ProductEntity> findFor(UUID accountId, Environment environment, UUID id) {
        return find("id = ?1 and accountId = ?2 and environment = ?3", id, accountId, environment)
                .firstResultOptional();
    }

    public static Optional<ProductEntity> findByCode(UUID accountId, Environment environment, String code) {
        return find("accountId = ?1 and environment = ?2 and code = ?3", accountId, environment, code)
                .firstResultOptional();
    }

    /**
     * Newest first, paginated by id (UUID v7): pass the last id of the previous page as {@code beforeId}.
     * {@code text} matches the code or the description.
     */
    public static List<ProductEntity> page(
            UUID accountId, Environment environment, String text, UUID beforeId, int limit) {
        StringBuilder query = new StringBuilder("accountId = :account and environment = :environment");
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("account", accountId);
        parameters.put("environment", environment);
        if (text != null && !text.isBlank()) {
            query.append(" and (lower(description) like :text escape '\\' or lower(code) like :text escape '\\')");
            parameters.put("text", Catalogs.containing(text));
        }
        if (beforeId != null) {
            query.append(" and id < :before");
            parameters.put("before", beforeId);
        }
        return find(query.append(" order by id desc").toString(), parameters)
                .page(0, limit)
                .list();
    }
}
