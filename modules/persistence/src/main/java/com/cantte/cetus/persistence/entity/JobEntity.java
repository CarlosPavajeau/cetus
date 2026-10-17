package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "jobs")
public class JobEntity extends PanacheEntityBase {

    @Id
    public UUID id;
    @Column(name = "job_type")
    public String jobType;
    @Column(name = "reference_id")
    public UUID referenceId;
    @JdbcTypeCode(SqlTypes.JSON)
    public String payload = "{}";
    public String status = "PENDING";
    public int attempts;
    @Column(name = "max_attempts")
    public int maxAttempts = 10;
    @Column(name = "run_at")
    public OffsetDateTime runAt;
    @Column(name = "locked_until")
    public OffsetDateTime lockedUntil;
    @Column(name = "locked_by")
    public String lockedBy;
    @Column(name = "last_error")
    public String lastError;
    @Column(name = "updated_at")
    public OffsetDateTime updatedAt;
}
