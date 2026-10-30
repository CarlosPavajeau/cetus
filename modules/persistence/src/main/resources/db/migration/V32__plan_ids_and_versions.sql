-- plan_versions replaces the prices of V31, which never held a row in production.
DROP TABLE plan_prices;
DROP FUNCTION plan_prices_only_close();

-- A plan is identified by a UUID v7; its code stays unique as the name people and code use. Accounts point at
-- the id from now on.
ALTER TABLE plans ADD COLUMN id UUID;
UPDATE plans SET id = uuidv7();

ALTER TABLE accounts ADD COLUMN plan_id UUID;
UPDATE accounts a SET plan_id = p.id FROM plans p WHERE p.code = a.plan;
ALTER TABLE accounts DROP COLUMN plan;

ALTER TABLE plans DROP CONSTRAINT plans_pkey,
    ALTER COLUMN id SET NOT NULL,
    ALTER COLUMN id SET DEFAULT uuidv7(),
    ADD PRIMARY KEY (id),
    ADD CONSTRAINT plans_code_key UNIQUE (code);

ALTER TABLE accounts ALTER COLUMN plan_id SET NOT NULL,
    ADD CONSTRAINT accounts_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES plans(id);

-- What a plan sells now lives in its versions. The subscription columns of V24 (price, documents, issuers,
-- overage, requests, grace) still drive the limits of accounts.plan_id until subscriptions arrive (phase 6);
-- a package or a top-up never has them. A top-up may require a product of another kind (a package) to be
-- bought. listed: shown in the catalog to everyone; an unlisted plan (Socios) is sold through versions made
-- for one account.
ALTER TABLE plans DROP CONSTRAINT plans_kind_lot_check,
    ADD COLUMN requires_kind TEXT CHECK (requires_kind IN ('SUBSCRIPTION', 'PACKAGE', 'TOPUP')),
    ADD COLUMN listed BOOLEAN NOT NULL DEFAULT true,
    ADD CONSTRAINT plans_kind_terms_check CHECK (
        (kind = 'SUBSCRIPTION' AND validity_months IS NULL AND requires_kind IS NULL)
        OR (kind <> 'SUBSCRIPTION' AND validity_months IS NOT NULL AND NOT assignable
            AND price_monthly_cop IS NULL AND documents_included IS NULL AND documents_grace IS NULL
            AND price_overage_cop IS NULL AND issuers_included IS NULL AND requests_per_second IS NULL
            AND (requires_kind IS NULL OR kind = 'TOPUP')));

UPDATE plans SET listed = false WHERE code IN ('FREE', 'SOCIOS');

-- The terms of a plan from valid_from to valid_to: price in cents (final when tax_included), tax rate,
-- documents, production issuers (none for a top-up) and the overage price (subscriptions only). A version
-- never changes: new terms are a new version, which closes the open one when it starts. account_id makes a
-- private version (Socios); each account, and the public catalog, has at most one open version per plan.
CREATE TABLE plan_versions (
    id                  UUID PRIMARY KEY DEFAULT uuidv7(),
    plan_id             UUID         NOT NULL REFERENCES plans(id),
    version             INT          NOT NULL CHECK (version > 0),
    account_id          UUID         REFERENCES accounts(id),
    price_cents         BIGINT       NOT NULL CHECK (price_cents >= 0),
    tax_included        BOOLEAN      NOT NULL,
    tax_rate            NUMERIC(5,4) NOT NULL CHECK (tax_rate >= 0 AND tax_rate < 1),
    documents_included  INT          NOT NULL CHECK (documents_included > 0),
    issuers_included    INT          CHECK (issuers_included > 0),
    price_overage_cents BIGINT       CHECK (price_overage_cents >= 0),
    valid_from          TIMESTAMPTZ  NOT NULL,
    valid_to            TIMESTAMPTZ  CHECK (valid_to > valid_from),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (plan_id, version)
);

CREATE UNIQUE INDEX uq_plan_versions_open ON plan_versions(plan_id, account_id) NULLS NOT DISTINCT
    WHERE valid_to IS NULL;
CREATE INDEX idx_plan_versions_account ON plan_versions(account_id) WHERE account_id IS NOT NULL;

-- The only change a version takes is its closing, once.
CREATE FUNCTION plan_versions_only_close() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'plan_versions are never deleted';
    END IF;
    IF OLD.valid_to IS NOT NULL OR NEW.valid_to IS NULL
        OR (NEW.id, NEW.plan_id, NEW.version, NEW.account_id, NEW.price_cents, NEW.tax_included, NEW.tax_rate,
            NEW.documents_included, NEW.issuers_included, NEW.price_overage_cents, NEW.valid_from, NEW.created_at)
           IS DISTINCT FROM
           (OLD.id, OLD.plan_id, OLD.version, OLD.account_id, OLD.price_cents, OLD.tax_included, OLD.tax_rate,
            OLD.documents_included, OLD.issuers_included, OLD.price_overage_cents, OLD.valid_from, OLD.created_at)
    THEN
        RAISE EXCEPTION 'a plan version only takes its valid_to, once';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plan_versions_immutable
    BEFORE UPDATE OR DELETE ON plan_versions
    FOR EACH ROW EXECUTE FUNCTION plan_versions_only_close();

-- The catalog of catalogo-planes-cetus.md: final prices with 19 % VAT included (to confirm with the accountant).
-- Subscriptions are loaded but not sold until phase 6; Socios gets private versions from the admin.
INSERT INTO plans (code, name, kind, validity_months, requires_kind, assignable)
VALUES ('EMPRENDEDOR', 'Emprendedor', 'PACKAGE', 12, NULL, false),
       ('NEGOCIO', 'Negocio', 'PACKAGE', 12, NULL, false),
       ('CONTADOR', 'Contador', 'PACKAGE', 12, NULL, false),
       ('RECARGA_100', 'Recarga de 100 documentos', 'TOPUP', 12, 'PACKAGE', false),
       ('RECARGA_500', 'Recarga de 500 documentos', 'TOPUP', 12, 'PACKAGE', false),
       ('RECARGA_1000', 'Recarga de 1.000 documentos', 'TOPUP', 12, 'PACKAGE', false);

INSERT INTO plan_versions (plan_id, version, price_cents, tax_included, tax_rate, documents_included,
                           issuers_included, price_overage_cents, valid_from)
SELECT p.id, 1, v.price_cents, true, 0.19, v.documents_included, v.issuers_included, v.price_overage_cents, now()
FROM (VALUES ('INICIAL', 3900000, 200, 1, 15000),
             ('CRECIMIENTO', 14900000, 2000, 3, 8000),
             ('ESCALA', 39900000, 10000, 10, 4500),
             ('EMPRENDEDOR', 11900000, 300, 1, NULL),
             ('NEGOCIO', 24900000, 1200, 1, NULL),
             ('CONTADOR', 59000000, 3000, 3, NULL),
             ('RECARGA_100', 2490000, 100, NULL, NULL),
             ('RECARGA_500', 9990000, 500, NULL, NULL),
             ('RECARGA_1000', 15990000, 1000, NULL, NULL))
         AS v(code, price_cents, documents_included, issuers_included, price_overage_cents)
JOIN plans p ON p.code = v.code;
