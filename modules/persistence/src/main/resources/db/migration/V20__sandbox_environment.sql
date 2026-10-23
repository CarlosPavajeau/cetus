-- SANDBOX: a third environment answered by a simulator instead of the DIAN.
ALTER TABLE api_keys DROP CONSTRAINT api_keys_environment_check,
    ADD CONSTRAINT api_keys_environment_check CHECK (environment IN ('TEST', 'LIVE', 'SANDBOX'));
ALTER TABLE issuers DROP CONSTRAINT issuers_environment_check,
    ADD CONSTRAINT issuers_environment_check CHECK (environment IN ('TEST', 'LIVE', 'SANDBOX'));
ALTER TABLE documents DROP CONSTRAINT documents_environment_check,
    ADD CONSTRAINT documents_environment_check CHECK (environment IN ('TEST', 'LIVE', 'SANDBOX'));
ALTER TABLE webhook_endpoints DROP CONSTRAINT webhook_endpoints_environment_check,
    ADD CONSTRAINT webhook_endpoints_environment_check CHECK (environment IN ('TEST', 'LIVE', 'SANDBOX'));
ALTER TABLE webhook_events DROP CONSTRAINT webhook_events_environment_check,
    ADD CONSTRAINT webhook_events_environment_check CHECK (environment IN ('TEST', 'LIVE', 'SANDBOX'));

-- Idempotency keys are scoped to an environment: an order id used first in the sandbox must not replay
-- the simulated document when the same order is invoiced in production. Completed keys take the
-- environment of the document they returned (every response carries its id). A key is only left in
-- progress inside its own uncommitted transaction, so the fallback is for rows that cannot exist.
ALTER TABLE idempotency_keys ADD COLUMN environment TEXT
    CHECK (environment IN ('TEST', 'LIVE', 'SANDBOX'));
-- The id is compared as a uuid so the lookup uses the primary key; CASE casts only values shaped like one.
UPDATE idempotency_keys k SET environment = COALESCE(
    (SELECT d.environment FROM documents d
     WHERE d.id = CASE WHEN k.response_body ->> 'id' ~ '^[0-9a-fA-F-]{36}$'
                       THEN CAST(k.response_body ->> 'id' AS uuid) END), 'TEST');
ALTER TABLE idempotency_keys ALTER COLUMN environment SET NOT NULL,
    DROP CONSTRAINT idempotency_keys_pkey,
    ADD PRIMARY KEY (account_id, environment, idem_key);
