package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** An incident the Cetus team publishes on the status page and in the console; see V45. */
@Entity
@Table(name = "status_incidents")
public class StatusIncidentEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    @Enumerated(EnumType.STRING)
    public StatusComponent component;

    @Enumerated(EnumType.STRING)
    public IncidentImpact impact;

    public String title;

    public String message;

    @Column(name = "started_at")
    public OffsetDateTime startedAt;

    @Column(name = "resolved_at")
    public OffsetDateTime resolvedAt;

    @Column(name = "created_by")
    public String createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt;

    public enum StatusComponent {
        API,
        PROCESSING,
        DIAN_LIVE,
        DIAN_TEST
    }

    public enum IncidentImpact {
        DEGRADED,
        OUTAGE
    }

    /** The open ones and those resolved since {@code resolvedSince}, newest first. */
    public static List<StatusIncidentEntity> recent(OffsetDateTime resolvedSince) {
        return list("resolvedAt is null or resolvedAt >= ?1 order by startedAt desc", resolvedSince);
    }

    public static List<StatusIncidentEntity> page(int limit) {
        return find("order by startedAt desc").page(0, limit).list();
    }
}
