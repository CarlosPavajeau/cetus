package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** A line of an order, with the amounts it applied; see V34. */
@Entity
@Table(name = "billing_order_items")
public class BillingOrderItemEntity extends PanacheEntityBase {

    public enum Type {
        PLAN,
        OVERAGE,
        ADJUSTMENT
    }

    @Id
    public UUID id;

    @Column(name = "order_id")
    public UUID orderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type")
    public Type itemType;

    @Column(name = "plan_version_id")
    public UUID planVersionId;

    public String description;

    public int quantity;

    /** Final: base and tax come from it. */
    @Column(name = "unit_price_cents")
    public long unitPriceCents;

    @Column(name = "base_cents")
    public long baseCents;

    @Column(name = "tax_rate")
    public BigDecimal taxRate;

    @Column(name = "tax_cents")
    public long taxCents;

    @Column(name = "total_cents")
    public long totalCents;

    public static List<BillingOrderItemEntity> listByOrder(UUID orderId) {
        return list("orderId = ?1 order by id", orderId);
    }

    /** The items of every order, each order's in the order {@link #listByOrder} gives them. */
    public static List<BillingOrderItemEntity> listByOrders(Collection<UUID> orderIds) {
        return orderIds.isEmpty() ? List.of() : list("orderId in ?1 order by id", orderIds);
    }
}
