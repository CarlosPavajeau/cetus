package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Entity
@Table(name = "accounts")
public class AccountEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    @Column(name = "organization_id", nullable = false, unique = true)
    public String organizationId;

    public String name;
    public String status = "ACTIVE";
    public String plan = "FREE";
    /** Why the status last changed (e.g. the suspension reason); null while it never changed. */
    @Column(name = "status_reason")
    public String statusReason;

    @Column(name = "status_changed_at")
    public OffsetDateTime statusChangedAt;
    /** Better Auth user id of the Cetus team member who changed it. */
    @Column(name = "status_changed_by")
    public String statusChangedBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    public static Optional<AccountEntity> findByOrganization(String organizationId) {
        return find("organizationId", organizationId).firstResultOptional();
    }
}
