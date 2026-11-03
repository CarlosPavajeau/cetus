-- People who left their email on the public pages: the obligation calculator's result, the partner program and
-- "Avísame" for an upcoming integration. No account behind them. details holds what each form asks; consent names
-- the privacy policy version the person authorized. The worker deletes rows past their retention.
CREATE TABLE leads (
    id             UUID PRIMARY KEY,
    kind           TEXT        NOT NULL CHECK (kind IN ('CALCULATOR', 'PARTNER', 'INTEGRATION')),
    email          TEXT        NOT NULL,
    details        JSONB       NOT NULL,
    policy_version TEXT        NOT NULL,
    ip             TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_email ON leads (lower(email), created_at);
CREATE INDEX idx_leads_ip ON leads (ip, created_at);
CREATE INDEX idx_leads_created ON leads (created_at);
