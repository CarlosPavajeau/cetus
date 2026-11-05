package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

/** A slot of a promotion an account took with the NIT of its first production issuer; see V47. */
@Entity
@Table(name = "promotion_claims")
public class PromotionClaimEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    @Column(name = "promotion_id")
    public UUID promotionId;

    @Column(name = "account_id")
    public UUID accountId;

    public String nit;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    public static long countByPromotion(UUID promotionId) {
        return count("promotionId", promotionId);
    }
}
