-- =====================================================================
-- Webhooks: integrators register URLs that receive a signed POST (Standard Webhooks) when one of their
-- documents changes. An event is recorded once per fact; each active endpoint subscribed to it gets a
-- delivery, sent by a DELIVER_WEBHOOK job enqueued in the same transaction.
-- =====================================================================

CREATE TABLE webhook_endpoints (
    id              UUID PRIMARY KEY,
    account_id      UUID        NOT NULL REFERENCES accounts(id),
    environment     TEXT        NOT NULL CHECK (environment IN ('TEST', 'LIVE')),
    url             TEXT        NOT NULL,
    description     TEXT,
    -- Event types the endpoint receives; empty means all of them.
    event_types     TEXT[]      NOT NULL DEFAULT '{}',
    -- whsec_... signing secret, sealed: the worker needs it in clear to compute the HMAC.
    secret_sealed   BYTEA       NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
    disabled_at     TIMESTAMPTZ,
    -- MANUAL from the console; AUTOMATIC when the endpoint kept failing (see consecutive_failures).
    disabled_reason TEXT        CHECK (disabled_reason IN ('MANUAL', 'AUTOMATIC')),
    -- Failed attempts since the last 2xx, and when that streak started. A 2xx resets both.
    consecutive_failures INT    NOT NULL DEFAULT 0,
    failing_since   TIMESTAMPTZ,
    created_by      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_endpoints_account ON webhook_endpoints(account_id, environment) WHERE status = 'ACTIVE';

CREATE TABLE webhook_events (
    id              UUID PRIMARY KEY,                   -- sent as webhook-id, stable across retries
    account_id      UUID        NOT NULL REFERENCES accounts(id),
    environment     TEXT        NOT NULL CHECK (environment IN ('TEST', 'LIVE')),
    type            TEXT        NOT NULL,
    document_id     UUID        NOT NULL REFERENCES documents(id),
    -- The exact body sent to every endpoint, so a redelivery repeats it byte for byte (JSON, not JSONB,
    -- keeps the text as written).
    payload         JSON        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- A fact is published once, even if the code that reports it runs twice.
CREATE UNIQUE INDEX uq_webhook_events_document_type ON webhook_events(document_id, type);

CREATE TABLE webhook_deliveries (
    id                   UUID PRIMARY KEY,
    event_id             UUID        NOT NULL REFERENCES webhook_events(id),
    endpoint_id          UUID        NOT NULL REFERENCES webhook_endpoints(id),
    status               TEXT        NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED')),
    attempts             INT         NOT NULL DEFAULT 0,
    last_response_status INT,
    last_response_body   TEXT,                          -- first KB of the endpoint's answer
    last_error           TEXT,
    last_attempt_at      TIMESTAMPTZ,
    delivered_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_webhook_deliveries_event_endpoint ON webhook_deliveries(event_id, endpoint_id);
CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id, id DESC);
