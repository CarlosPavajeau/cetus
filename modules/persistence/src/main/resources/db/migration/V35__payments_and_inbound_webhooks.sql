-- Each payment attempt of an order as the gateway reports it; raw is the gateway's JSON. A final status
-- (APPROVED, DECLINED, VOIDED, ERROR) is never replaced by PENDING, and APPROVED only by VOIDED.
CREATE TABLE payment_transactions (
    id                      UUID PRIMARY KEY DEFAULT uuidv7(),
    order_id                UUID        NOT NULL REFERENCES billing_orders(id),
    provider                TEXT        NOT NULL CHECK (provider IN ('WOMPI')),
    provider_transaction_id TEXT        NOT NULL,
    status                  TEXT        NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR')),
    amount_cents            BIGINT      NOT NULL CHECK (amount_cents >= 0),
    currency                TEXT        NOT NULL,
    payment_method_type     TEXT        NOT NULL,
    status_message          TEXT,
    raw                     JSONB       NOT NULL,
    provider_created_at     TIMESTAMPTZ NOT NULL,
    finalized_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_transaction_id)
);

CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);

-- Events received from providers, stored once their signature is checked and processed by a job
-- (PROCESS_WEBHOOK_EVENT). event_id is the provider's identity of the event: the unique key drops a resend.
-- Events with an invalid signature are never stored.
CREATE TABLE inbound_webhook_events (
    id           UUID PRIMARY KEY DEFAULT uuidv7(),
    provider     TEXT        NOT NULL CHECK (provider IN ('WOMPI', 'RESEND')),
    event_id     TEXT        NOT NULL,
    event_type   TEXT        NOT NULL,
    payload      JSONB       NOT NULL,
    status       TEXT        NOT NULL DEFAULT 'RECEIVED'
                     CHECK (status IN ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED')),
    attempts     INT         NOT NULL DEFAULT 0,
    error        TEXT,
    received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    UNIQUE (provider, event_id)
);
