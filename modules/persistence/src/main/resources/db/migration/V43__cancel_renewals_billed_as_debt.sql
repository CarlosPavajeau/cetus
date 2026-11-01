-- The renewals whose overage V42 moved to a debt are never to be paid: paying one too would bill that overage
-- twice. A payment approved for one later waits for a person.
UPDATE billing_orders o
SET status = 'CANCELED', updated_at = now()
FROM subscription_periods p
JOIN subscriptions s ON s.id = p.subscription_id
WHERE p.opening_order_id = o.id
  AND s.status = 'CANCELED'
  AND o.kind = 'RENEWAL'
  AND o.status IN ('PENDING', 'EXPIRED')
  AND EXISTS (SELECT 1
              FROM billing_order_items r
              JOIN billing_order_items d ON d.subscription_period_id = r.subscription_period_id
                                        AND d.item_type = 'OVERAGE'
              JOIN billing_orders debt ON debt.id = d.order_id AND debt.kind = 'DEBT'
              WHERE r.order_id = o.id AND r.item_type = 'OVERAGE');
