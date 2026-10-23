-- Who hears about the account, per category: TECHNICAL (webhooks, integration errors), FISCAL (certificate,
-- ranges, DIAN rejections) and BILLING (plan and payments). One address per category, always verified; a
-- change waits in pending_* until the new address follows the link sent to it, and until then the current
-- one keeps receiving the notices. Only the SHA-256 of the link's token is stored.
CREATE TABLE account_contacts (
    id                   UUID PRIMARY KEY,
    account_id           UUID        NOT NULL REFERENCES accounts(id),
    category             TEXT        NOT NULL CHECK (category IN ('TECHNICAL', 'FISCAL', 'BILLING')),
    email                TEXT        NOT NULL,
    verified_at          TIMESTAMPTZ NOT NULL,
    pending_email        TEXT,
    pending_token_hash   TEXT UNIQUE,
    pending_expires_at   TIMESTAMPTZ,
    pending_requested_at TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id, category)
);

-- Every notice emailed to an account's contacts. dedup_key names the fact it reports (for example
-- cert_expiring:<certificate id>:7d), so the same fact is never notified twice; recipients are resolved
-- when the email goes out.
CREATE TABLE notification_log (
    id          UUID PRIMARY KEY,
    account_id  UUID        NOT NULL REFERENCES accounts(id),
    kind        TEXT        NOT NULL,
    dedup_key   TEXT        NOT NULL UNIQUE,
    data        JSONB       NOT NULL DEFAULT '{}',
    status      TEXT        NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'SKIPPED', 'FAILED')),
    recipients  TEXT[]      NOT NULL DEFAULT '{}',
    error       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at     TIMESTAMPTZ
);
CREATE INDEX idx_notification_log_account ON notification_log(account_id, created_at DESC);
