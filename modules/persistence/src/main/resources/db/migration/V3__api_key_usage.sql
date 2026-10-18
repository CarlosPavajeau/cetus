-- =====================================================================
-- API key usage: one row per /v1 request authenticated with a key, for the console and for audits.
-- Only the method, the path without its query string and the outcome are kept: never headers or bodies.
-- =====================================================================

CREATE TABLE api_key_requests (
    id              UUID PRIMARY KEY,                   -- also returned to the client as X-Request-Id
    account_id      UUID        NOT NULL REFERENCES accounts(id),
    api_key_id      UUID        NOT NULL REFERENCES api_keys(id),
    method          TEXT        NOT NULL,
    path            TEXT        NOT NULL,
    status          SMALLINT    NOT NULL,
    duration_ms     INTEGER     NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_api_key_requests_key ON api_key_requests(api_key_id, created_at DESC);

-- Better Auth user id of whoever created the key. Keys created before this column take it from the audit log.
ALTER TABLE api_keys ADD COLUMN created_by TEXT;

UPDATE api_keys k
SET created_by = a.actor_id
FROM audit_log a
WHERE a.action = 'API_KEY_CREATED'
  AND a.actor_type = 'USER'
  AND a.resource_id = k.id;
