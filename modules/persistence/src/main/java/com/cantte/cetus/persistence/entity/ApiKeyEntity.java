package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.Environment;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Entity
@Table(name = "api_keys")
public class ApiKeyEntity extends PanacheEntityBase {

    @Id
    public UUID id;
    @Column(name = "account_id")
    public UUID accountId;
    @Enumerated(EnumType.STRING)
    public Environment environment;
    public String name;
    @Column(name = "key_prefix")
    public String keyPrefix;
    @Column(name = "key_hash")
    public String keyHash;
    @Column(name = "last_used_at")
    public OffsetDateTime lastUsedAt;
    @Column(name = "revoked_at")
    public OffsetDateTime revokedAt;
    /** Set by the database; read back after the insert, so it is available once the entity is flushed. */
    @Generated(event = EventType.INSERT)
    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    public static Optional<ApiKeyEntity> findActiveByHash(String hash) {
        return find("keyHash = ?1 and revokedAt is null", hash).firstResultOptional();
    }

    public static List<ApiKeyEntity> listByAccount(UUID accountId) {
        return list("accountId = ?1 order by createdAt desc", accountId);
    }
}
