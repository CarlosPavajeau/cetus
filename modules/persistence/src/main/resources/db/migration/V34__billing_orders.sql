-- What an account buys and what it pays. The server builds every item from plan_versions; an item keeps the
-- amounts it applied, so a later version never changes an order. billing_profile is a copy of who is invoiced
-- when the order was placed. reference is what the payment gateway knows the order by: random, never guessable.
-- An order expires unpaid at expires_at, which the checkout also enforces; a payment approved after that still
-- pays it. review_reason holds what needs a person, such as a payment whose amount is not the order's.
CREATE TABLE billing_orders (
    id                  UUID PRIMARY KEY DEFAULT uuidv7(),
    account_id          UUID        NOT NULL REFERENCES accounts(id),
    kind                TEXT        NOT NULL CHECK (kind IN ('PURCHASE', 'RENEWAL', 'MANUAL')),
    status              TEXT        NOT NULL CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED')),
    reference           TEXT        NOT NULL UNIQUE,
    subtotal_cents      BIGINT      NOT NULL CHECK (subtotal_cents >= 0),
    tax_cents           BIGINT      NOT NULL CHECK (tax_cents >= 0),
    total_cents         BIGINT      NOT NULL CHECK (total_cents = subtotal_cents + tax_cents),
    currency            TEXT        NOT NULL CHECK (currency = 'COP'),
    billing_profile     JSONB       NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    paid_at             TIMESTAMPTZ,
    invoice_document_id UUID REFERENCES documents(id),
    review_reason       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((status IN ('PAID', 'REFUNDED')) = (paid_at IS NOT NULL))
);

CREATE INDEX idx_billing_orders_account ON billing_orders(account_id, created_at DESC);
CREATE INDEX idx_billing_orders_pending ON billing_orders(expires_at) WHERE status = 'PENDING';

-- An item's unit price is final; base and tax come from it (domain.billing.Price) and are kept as applied.
CREATE TABLE billing_order_items (
    id               UUID PRIMARY KEY DEFAULT uuidv7(),
    order_id         UUID         NOT NULL REFERENCES billing_orders(id),
    item_type        TEXT         NOT NULL CHECK (item_type IN ('PLAN', 'OVERAGE', 'ADJUSTMENT')),
    plan_version_id  UUID REFERENCES plan_versions(id),
    description      TEXT         NOT NULL,
    quantity         INT          NOT NULL CHECK (quantity > 0),
    unit_price_cents BIGINT       NOT NULL CHECK (unit_price_cents >= 0),
    base_cents       BIGINT       NOT NULL CHECK (base_cents >= 0),
    tax_rate         NUMERIC(5,4) NOT NULL CHECK (tax_rate >= 0 AND tax_rate < 1),
    tax_cents        BIGINT       NOT NULL CHECK (tax_cents >= 0),
    total_cents      BIGINT       NOT NULL CHECK (total_cents = base_cents + tax_cents),
    CHECK (item_type <> 'PLAN' OR plan_version_id IS NOT NULL)
);

CREATE INDEX idx_billing_order_items_order ON billing_order_items(order_id);
