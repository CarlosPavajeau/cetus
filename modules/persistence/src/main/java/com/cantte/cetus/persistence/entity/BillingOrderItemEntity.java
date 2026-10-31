package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.billing.Price;
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

    /** The subscription period the item pays: the one a plan item opens, or the one whose overage it bills. */
    @Column(name = "subscription_period_id")
    public UUID subscriptionPeriodId;

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

    /**
     * Adds an item at a final unit price to the order, whose amounts grow by the item's.
     *
     * @param planVersionId the version a plan item sells; null for overage and adjustments
     */
    public static BillingOrderItemEntity add(
            BillingOrderEntity order,
            Type type,
            UUID planVersionId,
            UUID subscriptionPeriodId,
            String description,
            int quantity,
            long unitPriceCents,
            boolean taxIncluded,
            BigDecimal taxRate) {
        Price price = new Price(Math.multiplyExact(unitPriceCents, quantity), taxIncluded, taxRate);
        BillingOrderItemEntity item = new BillingOrderItemEntity();
        item.id = Ids.newId();
        item.orderId = order.id;
        item.itemType = type;
        item.planVersionId = planVersionId;
        item.subscriptionPeriodId = subscriptionPeriodId;
        item.description = description;
        item.quantity = quantity;
        item.unitPriceCents = unitPriceCents;
        item.baseCents = price.baseCents();
        item.taxRate = taxRate;
        item.taxCents = price.taxCents();
        item.totalCents = price.totalCents();
        item.persist();
        order.subtotalCents += item.baseCents;
        order.taxCents += item.taxCents;
        order.totalCents += item.totalCents;
        return item;
    }

    public static List<BillingOrderItemEntity> listByOrder(UUID orderId) {
        return list("orderId = ?1 order by id", orderId);
    }

    /** The items of every order, each order's in the order {@link #listByOrder} gives them. */
    public static List<BillingOrderItemEntity> listByOrders(Collection<UUID> orderIds) {
        return orderIds.isEmpty() ? List.of() : list("orderId in ?1 order by id", orderIds);
    }
}
