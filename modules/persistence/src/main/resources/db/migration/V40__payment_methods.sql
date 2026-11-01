-- A card an account saved to pay its renewals without the customer: a Wompi payment source. Only what is shown
-- is kept (brand, last four digits, expiry), never the card's number nor its token. Wompi cannot void a card
-- source, so a REMOVED card is only never charged again. An account has at most one ACTIVE card.
CREATE TABLE payment_methods (
    id                 UUID PRIMARY KEY DEFAULT uuidv7(),
    account_id         UUID        NOT NULL REFERENCES accounts(id),
    provider           TEXT        NOT NULL CHECK (provider IN ('WOMPI')),
    provider_source_id TEXT        NOT NULL,
    type               TEXT        NOT NULL CHECK (type IN ('CARD')),
    brand              TEXT        NOT NULL,
    last_four          TEXT        NOT NULL CHECK (last_four ~ '^[0-9]{4}$'),
    exp_month          INT         NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
    exp_year           INT         NOT NULL CHECK (exp_year BETWEEN 2000 AND 2199),
    customer_email     TEXT        NOT NULL,
    status             TEXT        NOT NULL CHECK (status IN ('ACTIVE', 'REMOVED')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_at         TIMESTAMPTZ,
    UNIQUE (provider, provider_source_id),
    CHECK ((status = 'REMOVED') = (removed_at IS NOT NULL))
);

CREATE UNIQUE INDEX uq_payment_methods_account ON payment_methods(account_id) WHERE status = 'ACTIVE';

-- Each attempt to charge an order to a saved card, with a reference of its own (the order's and the attempt's
-- number): Wompi takes a reference once. AUTO attempts are the renewal's and its retries; MANUAL ones were asked
-- for from the console. An order has at most one attempt waiting to run or to be answered.
CREATE TABLE payment_charges (
    id                      UUID PRIMARY KEY DEFAULT uuidv7(),
    order_id                UUID        NOT NULL REFERENCES billing_orders(id),
    payment_method_id       UUID        NOT NULL REFERENCES payment_methods(id),
    attempt                 INT         NOT NULL CHECK (attempt > 0),
    origin                  TEXT        NOT NULL CHECK (origin IN ('AUTO', 'MANUAL')),
    reference               TEXT        NOT NULL UNIQUE,
    status                  TEXT        NOT NULL
                                CHECK (status IN ('SCHEDULED', 'SUBMITTED', 'APPROVED', 'FAILED', 'CANCELED')),
    run_at                  TIMESTAMPTZ NOT NULL,
    provider_transaction_id TEXT,
    failure_message         TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (order_id, attempt)
);

CREATE UNIQUE INDEX uq_payment_charges_order_live ON payment_charges(order_id)
    WHERE status IN ('SCHEDULED', 'SUBMITTED');
