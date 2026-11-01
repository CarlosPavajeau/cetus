-- A debt is an order for what an account already consumed and did not pay: the documents of an order whose payment
-- was charged back, or the overage of a subscription that ended. It never expires and blocks new purchases while
-- pending; an administrator may waive it (CANCELED).
ALTER TABLE billing_orders DROP CONSTRAINT billing_orders_kind_check;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_kind_check
    CHECK (kind IN ('PURCHASE', 'RENEWAL', 'MANUAL', 'DEBT'));
ALTER TABLE billing_orders DROP CONSTRAINT billing_orders_status_check;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_status_check
    CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED', 'CANCELED'));
ALTER TABLE billing_orders ALTER COLUMN expires_at DROP NOT NULL;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_expiry_check
    CHECK (expires_at IS NOT NULL OR kind = 'DEBT');

CREATE INDEX idx_billing_orders_debt ON billing_orders(account_id) WHERE kind = 'DEBT' AND status = 'PENDING';

-- The overage of a subscription that ended unpaid was left in an order that expires; it is a debt.
UPDATE billing_orders o
SET kind = 'DEBT', status = 'PENDING', expires_at = NULL, updated_at = now()
FROM subscription_periods p
JOIN subscriptions s ON s.id = p.subscription_id
WHERE p.closing_order_id = o.id
  AND s.status = 'CANCELED'
  AND o.status IN ('PENDING', 'EXPIRED')
  AND NOT EXISTS (SELECT 1 FROM subscription_periods n WHERE n.opening_order_id = o.id);

-- Money that goes back from a paid order: a refund Cetus asks the gateway for (WOMPI) or one made elsewhere
-- (EXTERNAL), and a chargeback the bank made, always registered (EXTERNAL). An approved reversal revokes what
-- the order's lots have left (credits_revoked); a chargeback leaves what was consumed as a debt (debt_order_id).
-- An order has at most one reversal waiting to be sent or answered.
CREATE TABLE payment_reversals (
    id                      UUID PRIMARY KEY DEFAULT uuidv7(),
    order_id                UUID        NOT NULL REFERENCES billing_orders(id),
    account_id              UUID        NOT NULL REFERENCES accounts(id),
    number                  INT         NOT NULL CHECK (number > 0),
    kind                    TEXT        NOT NULL CHECK (kind IN ('REFUND', 'CHARGEBACK')),
    mode                    TEXT        NOT NULL CHECK (mode IN ('WOMPI', 'EXTERNAL')),
    reference               TEXT        NOT NULL UNIQUE,
    amount_cents            BIGINT      NOT NULL CHECK (amount_cents > 0),
    status                  TEXT        NOT NULL CHECK (status IN ('REQUESTED', 'SUBMITTED', 'APPROVED', 'FAILED')),
    provider_transaction_id TEXT,
    provider_refund_id      TEXT,
    failure_message         TEXT,
    reason                  TEXT        NOT NULL,
    actor_type              TEXT        NOT NULL CHECK (actor_type IN ('USER', 'API_KEY', 'PLATFORM', 'SYSTEM')),
    actor_id                TEXT,
    credits_revoked         INT CHECK (credits_revoked >= 0),
    debt_cents              BIGINT CHECK (debt_cents >= 0),
    debt_order_id           UUID REFERENCES billing_orders(id) UNIQUE,
    credit_note_document_id UUID REFERENCES documents(id) UNIQUE,
    approved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (order_id, number),
    CHECK (kind = 'REFUND' OR mode = 'EXTERNAL'),
    CHECK (mode = 'EXTERNAL' OR provider_transaction_id IS NOT NULL),
    CHECK ((status = 'APPROVED') = (approved_at IS NOT NULL))
);

CREATE UNIQUE INDEX uq_payment_reversals_order_live ON payment_reversals(order_id)
    WHERE status IN ('REQUESTED', 'SUBMITTED');
CREATE INDEX idx_payment_reversals_account ON payment_reversals(account_id, created_at DESC);
CREATE INDEX idx_payment_reversals_approved ON payment_reversals(approved_at) WHERE status = 'APPROVED';
