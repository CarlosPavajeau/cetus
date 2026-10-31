-- A monthly subscription of an account: the version it pays (plan_version_id), the one the next period takes
-- (next_plan_version_id, a scheduled change), and how much overage it may run up in a period before new
-- documents are refused (overage_limit_cents). PAST_DUE while the renewal of the open period is unpaid, which
-- still issues; CANCELED after the grace days or at the end of a period the owner chose to cancel. An account has
-- at most one subscription that is not canceled.
CREATE TABLE subscriptions (
    id                   UUID PRIMARY KEY DEFAULT uuidv7(),
    account_id           UUID        NOT NULL REFERENCES accounts(id),
    plan_version_id      UUID        NOT NULL REFERENCES plan_versions(id),
    next_plan_version_id UUID        REFERENCES plan_versions(id),
    status               TEXT        NOT NULL CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELED')),
    overage_limit_cents  BIGINT      NOT NULL CHECK (overage_limit_cents >= 0),
    cancel_at_period_end BOOLEAN     NOT NULL DEFAULT false,
    started_at           TIMESTAMPTZ NOT NULL,
    past_due_at          TIMESTAMPTZ,
    canceled_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((status = 'PAST_DUE') = (past_due_at IS NOT NULL)),
    CHECK ((status = 'CANCELED') = (canceled_at IS NOT NULL))
);

CREATE UNIQUE INDEX uq_subscriptions_account ON subscriptions(account_id) WHERE status <> 'CANCELED';

-- A month of a subscription, [starts_at, ends_at), with the version it was sold at. Its lot (grant_id) comes when
-- the order that opens it is paid; the order that closes it bills its overage and opens the next one.
CREATE TABLE subscription_periods (
    id               UUID PRIMARY KEY DEFAULT uuidv7(),
    subscription_id  UUID        NOT NULL REFERENCES subscriptions(id),
    number           INT         NOT NULL CHECK (number > 0),
    plan_version_id  UUID        NOT NULL REFERENCES plan_versions(id),
    starts_at        TIMESTAMPTZ NOT NULL,
    ends_at          TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
    status           TEXT        NOT NULL CHECK (status IN ('OPEN', 'CLOSED')),
    grant_id         UUID REFERENCES credit_grants(id),
    opening_order_id UUID REFERENCES billing_orders(id) UNIQUE,
    closing_order_id UUID REFERENCES billing_orders(id),
    overage_quantity INT CHECK (overage_quantity >= 0),
    closed_at        TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (subscription_id, number),
    CHECK ((status = 'CLOSED') = (closed_at IS NOT NULL)),
    CHECK ((status = 'CLOSED') = (overage_quantity IS NOT NULL))
);

CREATE UNIQUE INDEX uq_subscription_periods_open ON subscription_periods(subscription_id) WHERE status = 'OPEN';
CREATE INDEX idx_subscription_periods_due ON subscription_periods(ends_at) WHERE status = 'OPEN';

-- An overage document belongs to the period it is billed in.
ALTER TABLE credit_reservations
    ADD COLUMN subscription_period_id UUID REFERENCES subscription_periods(id),
    ADD CONSTRAINT credit_reservations_period_check
        CHECK ((kind = 'OVERAGE') = (subscription_period_id IS NOT NULL));

CREATE INDEX idx_credit_reservations_period ON credit_reservations(subscription_period_id)
    WHERE subscription_period_id IS NOT NULL;

ALTER TABLE billing_order_items ADD COLUMN subscription_period_id UUID REFERENCES subscription_periods(id);
