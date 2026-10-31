package com.cantte.cetus.persistence.entity;

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
import java.util.UUID;

/** What a LIVE document holds of the account's credits; see V36. */
@Entity
@Table(name = "credit_reservations")
public class CreditReservationEntity extends PanacheEntityBase {

    public enum Kind {
        CREDIT,
        OVERAGE,
        GRACE
    }

    public enum Status {
        RESERVED,
        CONFIRMED,
        RELEASED
    }

    @Id
    public UUID id;

    @Column(name = "account_id")
    public UUID accountId;

    @Column(name = "document_id")
    public UUID documentId;

    /** The lot it took a credit from; null for overage and grace. */
    @Column(name = "grant_id")
    public UUID grantId;

    @Enumerated(EnumType.STRING)
    public Kind kind;

    public int quantity;

    @Enumerated(EnumType.STRING)
    public Status status;

    /** A grace document paid by a later lot, or an overage document billed at its period's close. */
    public boolean settled;

    @Column(name = "created_at", updatable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public static List<CreditReservationEntity> listByDocument(UUID documentId) {
        return list("documentId = ?1 order by createdAt, id", documentId);
    }

    /** Grace documents not released and not yet paid by a lot, oldest first. */
    public static List<CreditReservationEntity> listGraceOpen(UUID accountId) {
        return list(
                "accountId = ?1 and kind = ?2 and not settled and status <> ?3 order by createdAt, id",
                accountId,
                Kind.GRACE,
                Status.RELEASED);
    }
}
