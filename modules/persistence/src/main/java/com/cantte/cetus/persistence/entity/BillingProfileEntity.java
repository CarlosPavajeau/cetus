package com.cantte.cetus.persistence.entity;

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
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Who Cetus invoices for an account's purchases; see V31. */
@Entity
@Table(name = "billing_profiles")
public class BillingProfileEntity extends PanacheEntityBase {

    @Id
    @Column(name = "account_id")
    public UUID accountId;

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
}
