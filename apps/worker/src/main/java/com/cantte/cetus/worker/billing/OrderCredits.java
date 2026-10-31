package com.cantte.cetus.worker.billing;

import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import com.cantte.cetus.persistence.entity.BillingOrderItemEntity;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

/**
 * Grants a lot for each plan item of an order in the transaction that pays it, so a paid order always has its
 * credits. A package or a top-up lasts its validity months from the payment.
 */
@ApplicationScoped
public class OrderCredits {

    @Inject
    CreditLedger ledger;

    void on(@Observes PaymentSettlement.OrderPaid paid) {
        BillingOrderEntity order = BillingOrderEntity.<BillingOrderEntity>findByIdOptional(paid.orderId())
                .orElseThrow();
        for (BillingOrderItemEntity item : BillingOrderItemEntity.listByOrder(order.id)) {
            if (item.itemType != BillingOrderItemEntity.Type.PLAN) {
                continue;
            }
            PlanVersionEntity version = PlanVersionEntity.<PlanVersionEntity>findByIdOptional(item.planVersionId)
                    .orElseThrow();
            PlanEntity plan =
                    PlanEntity.<PlanEntity>findByIdOptional(version.planId).orElseThrow();
            if (plan.kind == PlanEntity.Kind.SUBSCRIPTION) {
                throw new IllegalStateException("Order " + order.id + " sells a subscription before phase 6");
            }
            ledger.grant(
                    order.accountId,
                    new CreditLedger.Source(CreditGrantEntity.SourceType.ORDER_ITEM, item.id),
                    version.id,
                    version.documentsIncluded * item.quantity,
                    order.paidAt.plusMonths(plan.validityMonths),
                    Actor.system(),
                    null);
        }
    }
}
