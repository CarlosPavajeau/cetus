package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Entity
@Table(name = "accounts")
public class AccountEntity extends PanacheEntityBase {

    @Schema(name = "AccountStatus")
    public enum Status {
        ACTIVE,
        SUSPENDED,
        CLOSED
    }

    @Id
    public UUID id;

    @Column(name = "organization_id", nullable = false, unique = true)
    public String organizationId;

    public String name;

    @Enumerated(EnumType.STRING)
    public Status status = Status.ACTIVE;

    public String plan = "FREE";
    /** Why the status last changed (e.g. the suspension reason); null while it never changed. */
    @Column(name = "status_reason")
    public String statusReason;

    @Column(name = "status_changed_at")
    public OffsetDateTime statusChangedAt;
    /** Better Auth user id of the Cetus team member who changed it. */
    @Column(name = "status_changed_by")
    public String statusChangedBy;

    /** The account's own production API limits, above its plan's; null follows the plan. Set by hand. */
    @Column(name = "requests_per_second")
    public Integer requestsPerSecond;

    @Column(name = "requests_burst")
    public Integer requestsBurst;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    public static Optional<AccountEntity> findByOrganization(String organizationId) {
        return find("organizationId", organizationId).firstResultOptional();
    }
}
