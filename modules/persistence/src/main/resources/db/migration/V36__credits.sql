-- Credits: one mechanism for every way an account gets documents. A grant is a lot of credits from one source
-- (an order item, a subscription period, a promotion, an adjustment), granted once per source, which documents
-- consume first-expiring-first. plan_version_id is the product the lot comes from, which decides whether the
-- account has a product and how many production issuers it includes; a promotion or an adjustment may have none.
CREATE TABLE credit_grants (
    id              UUID PRIMARY KEY DEFAULT uuidv7(),
    account_id      UUID        NOT NULL REFERENCES accounts(id),
    plan_version_id UUID        REFERENCES plan_versions(id),
    source_type     TEXT        NOT NULL CHECK (source_type IN ('ORDER_ITEM', 'SUBSCRIPTION_PERIOD', 'PROMO', 'ADJUSTMENT')),
    source_id       UUID        NOT NULL,
    quantity        INT         NOT NULL CHECK (quantity > 0),
    remaining       INT         NOT NULL CHECK (remaining BETWEEN 0 AND quantity),
    expires_at      TIMESTAMPTZ NOT NULL,
    status          TEXT        NOT NULL CHECK (status IN ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'REVOKED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_type, source_id),
    CHECK (status <> 'ACTIVE' OR remaining > 0),
    CHECK (status <> 'EXHAUSTED' OR remaining = 0)
);

CREATE INDEX idx_credit_grants_account ON credit_grants(account_id, expires_at);
CREATE INDEX idx_credit_grants_live ON credit_grants(expires_at) WHERE status IN ('ACTIVE', 'EXHAUSTED');

-- What a LIVE document holds from creation until the DIAN decides: a credit of a lot (CREDIT), a document past
-- a subscription's credits billed at its close (OVERAGE, phase 6) or a document within a package's grace margin
-- (GRACE), which the next lot settles. Confirmed when accepted, released when rejected.
CREATE TABLE credit_reservations (
    id          UUID PRIMARY KEY DEFAULT uuidv7(),
    account_id  UUID        NOT NULL REFERENCES accounts(id),
    document_id UUID        NOT NULL REFERENCES documents(id),
    grant_id    UUID        REFERENCES credit_grants(id),
    kind        TEXT        NOT NULL CHECK (kind IN ('CREDIT', 'OVERAGE', 'GRACE')),
    quantity    INT         NOT NULL CHECK (quantity > 0),
    status      TEXT        NOT NULL CHECK (status IN ('RESERVED', 'CONFIRMED', 'RELEASED')),
    settled     BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_id, grant_id),
    CHECK ((kind = 'CREDIT') = (grant_id IS NOT NULL)),
    CHECK (NOT settled OR kind <> 'CREDIT')
);

CREATE UNIQUE INDEX uq_credit_reservations_without_grant ON credit_reservations(document_id) WHERE grant_id IS NULL;
CREATE INDEX idx_credit_reservations_grace ON credit_reservations(account_id, created_at)
    WHERE kind = 'GRACE' AND NOT settled AND status <> 'RELEASED';

-- Every change of credits, never changed nor deleted: a mistake is corrected with another movement. A movement
-- of a lot adds its signed quantity to it, so a lot's remaining is the sum of its movements; CONFIRM moves
-- nothing. A movement of a reservation without a lot records it without moving any lot.
CREATE TABLE credit_movements (
    id             UUID PRIMARY KEY DEFAULT uuidv7(),
    account_id     UUID        NOT NULL REFERENCES accounts(id),
    grant_id       UUID        REFERENCES credit_grants(id),
    reservation_id UUID        REFERENCES credit_reservations(id),
    document_id    UUID        REFERENCES documents(id),
    type           TEXT        NOT NULL CHECK (type IN ('GRANT', 'RESERVE', 'CONFIRM', 'RELEASE', 'EXPIRE', 'SETTLE',
                                                        'BILL_OVERAGE', 'ADJUST', 'REVOKE')),
    quantity       INT         NOT NULL,
    actor_type     TEXT        NOT NULL CHECK (actor_type IN ('USER', 'API_KEY', 'PLATFORM', 'SYSTEM')),
    actor_id       TEXT,
    reason         TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_movements_account ON credit_movements(account_id, created_at DESC);
CREATE INDEX idx_credit_movements_grant ON credit_movements(grant_id) WHERE grant_id IS NOT NULL;
CREATE INDEX idx_credit_movements_document ON credit_movements(document_id) WHERE document_id IS NOT NULL;

CREATE FUNCTION credit_movements_are_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'credit_movements is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_movements_no_update_delete
    BEFORE UPDATE OR DELETE ON credit_movements
    FOR EACH ROW EXECUTE FUNCTION credit_movements_are_append_only();

CREATE TRIGGER credit_movements_no_truncate
    BEFORE TRUNCATE ON credit_movements
    FOR EACH STATEMENT EXECUTE FUNCTION credit_movements_are_append_only();
