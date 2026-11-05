-- A plan whose lots give no grace margin: past its documents the account buys a package.
ALTER TABLE plans ADD COLUMN grace_margin BOOLEAN NOT NULL DEFAULT true;

-- Courtesy documents, never sold: unlisted, inactive and free.
INSERT INTO plans (code, name, kind, validity_months, listed, active, grace_margin)
VALUES ('CORTESIA', 'Cortesía', 'PACKAGE', 3, false, false, false);

INSERT INTO plan_versions (plan_id, version, price_cents, tax_included, tax_rate, documents_included,
                           issuers_included, valid_from)
SELECT id, 1, 0, true, 0, 50, 1, now() FROM plans WHERE code = 'CORTESIA';

-- A promotion gives a lot of its version to the first `slots` accounts that create their first production issuer
-- without ever having had a product. A NIT claims once across promotions, so a new organization for the same
-- company gets nothing. At most one promotion is active.
CREATE TABLE promotions (
    id              UUID PRIMARY KEY DEFAULT uuidv7(),
    code            TEXT        NOT NULL UNIQUE,
    plan_version_id UUID        NOT NULL REFERENCES plan_versions(id),
    slots           INT         NOT NULL CHECK (slots > 0),
    validity_days   INT         NOT NULL CHECK (validity_days > 0),
    active          BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_promotions_active ON promotions ((true)) WHERE active;

CREATE TABLE promotion_claims (
    id           UUID PRIMARY KEY,
    promotion_id UUID        NOT NULL REFERENCES promotions(id),
    account_id   UUID        NOT NULL REFERENCES accounts(id),
    nit          TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (promotion_id, account_id)
);

CREATE INDEX idx_promotion_claims_promotion ON promotion_claims (promotion_id);
CREATE INDEX idx_promotion_claims_nit ON promotion_claims (nit);
CREATE INDEX idx_promotion_claims_account ON promotion_claims (account_id);

INSERT INTO promotions (code, plan_version_id, slots, validity_days)
SELECT 'LANZAMIENTO', v.id, 30, 90
FROM plan_versions v JOIN plans p ON p.id = v.plan_id
WHERE p.code = 'CORTESIA';
