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
import org.hibernate.annotations.Immutable;

/** A change of credits; the database refuses to change or delete one (V36). */
@Entity
@Immutable
@Table(name = "credit_movements")
public class CreditMovementEntity extends PanacheEntityBase {

    public enum Type {
        GRANT,
        RESERVE,
        CONFIRM,
        RELEASE,
        EXPIRE,
        SETTLE,
        BILL_OVERAGE,
        ADJUST,
        REVOKE
    }

    @Id
    public UUID id;

    @Column(name = "account_id")
    public UUID accountId;

    @Column(name = "grant_id")
    public UUID grantId;

    @Column(name = "reservation_id")
    public UUID reservationId;

    @Column(name = "document_id")
    public UUID documentId;

    @Enumerated(EnumType.STRING)
    public Type type;

    /** Added to the lot's remaining when there is a lot. */
    public int quantity;

    @Column(name = "actor_type")
    public String actorType;

    @Column(name = "actor_id")
    public String actorId;

    public String reason;

    @Column(name = "created_at", updatable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    public static List<CreditMovementEntity> listByAccount(UUID accountId, int limit) {
        return find("accountId = ?1 order by createdAt desc, id desc", accountId)
                .page(0, limit)
                .list();
    }
}
