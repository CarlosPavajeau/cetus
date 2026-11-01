-- A renewal bills the fee of the new period with the overage of the one that closed. When a subscription was canceled
-- with its renewal unpaid, that overage was consumed and never billed again: it becomes a debt of its own, with the
-- renewal's overage items copied (V41 only converted closing orders that bill nothing else).
CREATE TEMP TABLE unpaid_renewal_overage ON COMMIT DROP AS
SELECT o.id AS renewal_id, o.account_id, o.billing_profile, uuidv7() AS debt_id
FROM billing_orders o
JOIN subscription_periods p ON p.opening_order_id = o.id
JOIN subscriptions s ON s.id = p.subscription_id
WHERE s.status = 'CANCELED'
  AND o.kind = 'RENEWAL'
  AND o.status IN ('PENDING', 'EXPIRED')
  AND EXISTS (SELECT 1 FROM billing_order_items i WHERE i.order_id = o.id AND i.item_type = 'OVERAGE');

INSERT INTO billing_orders (id, account_id, kind, status, reference, subtotal_cents, tax_cents, total_cents, currency,
                            billing_profile, expires_at)
SELECT u.debt_id, u.account_id, 'DEBT', 'PENDING', 'CET-' || upper(replace(gen_random_uuid()::text, '-', '')),
       sum(i.base_cents), sum(i.tax_cents), sum(i.total_cents), 'COP', u.billing_profile, NULL
FROM unpaid_renewal_overage u
JOIN billing_order_items i ON i.order_id = u.renewal_id AND i.item_type = 'OVERAGE'
GROUP BY u.debt_id, u.account_id, u.billing_profile;

INSERT INTO billing_order_items (order_id, item_type, plan_version_id, subscription_period_id, description, quantity,
                                 unit_price_cents, base_cents, tax_rate, tax_cents, total_cents)
SELECT u.debt_id, 'OVERAGE', NULL, i.subscription_period_id, i.description, i.quantity, i.unit_price_cents,
       i.base_cents, i.tax_rate, i.tax_cents, i.total_cents
FROM unpaid_renewal_overage u
JOIN billing_order_items i ON i.order_id = u.renewal_id AND i.item_type = 'OVERAGE';
