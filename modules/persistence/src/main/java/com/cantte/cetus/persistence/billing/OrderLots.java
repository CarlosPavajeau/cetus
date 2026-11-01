package com.cantte.cetus.persistence.billing;

import com.cantte.cetus.domain.billing.Consumption;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.SubscriptionPeriodEntity;
import io.quarkus.hibernate.orm.panache.Panache;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The lots an order paid for and what the account used of them: a package's or a top-up's lot per plan item, and
 * the lot of the subscription period the order opened. Used means reserved by a document and not released, or
 * paying a grace or overage document; credits that expired, were revoked or taken by an adjustment were not used.
 */
public final class OrderLots {

    private OrderLots() {}

    /**
     * @param lot the item's lot; empty for an item without one (overage, an adjustment, a period never granted)
     * @param consumed documents of the lot used
     */
    public record Item(BillingOrderItemEntity item, Optional<CreditGrantEntity> lot, int consumed) {

        /**
         * What was used of the item: its share of a plan's lot, or all of an overage or an adjustment, which pay
         * for documents already issued.
         */
        public long consumedCents() {
            if (item.itemType != BillingOrderItemEntity.Type.PLAN) {
                return item.totalCents;
            }
            return lot.map(granted -> Consumption.valueCents(item.totalCents, consumed, granted.quantity))
                    .orElse(0L);
        }
    }

    public static List<Item> of(UUID orderId) {
        Optional<UUID> periodLot =
                SubscriptionPeriodEntity.findByOpeningOrder(orderId).map(period -> period.grantId);
        List<Item> items = new ArrayList<>();
        for (BillingOrderItemEntity item : BillingOrderItemEntity.listByOrder(orderId)) {
            if (item.itemType != BillingOrderItemEntity.Type.PLAN) {
                items.add(new Item(item, Optional.empty(), 0));
                continue;
            }
            Optional<CreditGrantEntity> lot = CreditGrantEntity.findBySource(
                            CreditGrantEntity.SourceType.ORDER_ITEM, item.id)
                    .or(() -> periodLot.map(lotId -> CreditGrantEntity.<CreditGrantEntity>findById(lotId)));
            items.add(
                    new Item(item, lot, lot.map(granted -> consumed(granted.id)).orElse(0)));
        }
        return items;
    }

    /** What the account used of the order's items. */
    public static long consumedCents(UUID orderId) {
        return of(orderId).stream().mapToLong(Item::consumedCents).sum();
    }

    /** Documents of the lot used: what reservations and settlements took from it, less what releases gave back. */
    public static int consumed(UUID lotId) {
        return -((Number) Panache.getEntityManager()
                        .createNativeQuery("""
                                SELECT coalesce(sum(quantity), 0) FROM billing.credit_movements
                                WHERE grant_id = :lot AND type IN ('RESERVE', 'RELEASE', 'SETTLE')
                                """)
                        .setParameter("lot", lotId)
                        .getSingleResult())
                .intValue();
    }
}
