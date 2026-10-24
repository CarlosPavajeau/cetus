package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.Party;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A customer saved in an account's catalog for one environment; see V22. */
@Entity
@Table(name = "customers")
public class CustomerEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    @Column(name = "account_id")
    public UUID accountId;

    @Enumerated(EnumType.STRING)
    public Environment environment;

    @Enumerated(EnumType.STRING)
    @Column(name = "identification_type")
    public IdentificationType identificationType;

    @Column(name = "identification_number")
    public String identificationNumber;

    @Column(name = "legal_name")
    public String legalName;

    @JdbcTypeCode(SqlTypes.JSON)
    public Party party;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    /** Keeps the searchable columns in step with the party. */
    public void assign(Party value) {
        party = value;
        identificationType = value.identificationType();
        identificationNumber = value.identificationNumber();
        legalName = value.legalName();
    }

    public static Optional<CustomerEntity> findFor(UUID accountId, Environment environment, UUID id) {
        return find("id = ?1 and accountId = ?2 and environment = ?3", id, accountId, environment)
                .firstResultOptional();
    }

    public static Optional<CustomerEntity> findByIdentification(
            UUID accountId, Environment environment, IdentificationType type, String number) {
        return find(
                        "accountId = ?1 and environment = ?2 and identificationType = ?3 and identificationNumber = ?4",
                        accountId,
                        environment,
                        type,
                        number)
                .firstResultOptional();
    }

    /** Must stay identical to the expression of idx_customers_search (V23), or the planner will not use it. */
    static final String SEARCH_TEXT = "(legal_name || E'\\n' || identification_number)";

    /**
     * Newest first, paginated by id (UUID v7): pass the last id of the previous page as {@code beforeId}.
     * {@code text} matches the name or the identification number, whatever the case.
     */
    public static List<CustomerEntity> page(
            UUID accountId, Environment environment, String text, UUID beforeId, int limit) {
        return Catalogs.page(
                CustomerEntity.class, "customers", SEARCH_TEXT, accountId, environment, text, beforeId, limit);
    }
}
