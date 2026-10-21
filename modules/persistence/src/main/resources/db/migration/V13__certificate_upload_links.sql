-- One-time links the Cetus team sends so a customer (or their accountant) uploads an issuer's .p12 without
-- a console account. Only the SHA-256 of the token is stored; a link is spent once a certificate is saved.
CREATE TABLE certificate_upload_links (
    id          UUID PRIMARY KEY,
    account_id  UUID        NOT NULL REFERENCES accounts(id),
    issuer_id   UUID        NOT NULL REFERENCES issuers(id),
    token_hash  TEXT        NOT NULL UNIQUE,
    created_by  TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_certificate_upload_links_issuer ON certificate_upload_links(issuer_id) WHERE used_at IS NULL;
