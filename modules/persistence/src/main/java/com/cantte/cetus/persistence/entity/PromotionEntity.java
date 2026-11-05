package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

/** Free lots of one plan version for the first accounts that go to production; see V47. */
@Entity
@Table(name = "promotions")
public class PromotionEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    public String code;

    @Column(name = "plan_version_id")
    public UUID planVersionId;

    public int slots;

    @Column(name = "validity_days")
    public int validityDays;

    public boolean active;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    public static Optional<PromotionEntity> findActive() {
        return find("active", true).firstResultOptional();
    }

    /** The active promotion, locked until the transaction ends so two claims never take its last slot. */
    public static Optional<PromotionEntity> lockActive() {
        return find("active", true).withLock(LockModeType.PESSIMISTIC_WRITE).firstResultOptional();
    }
}
