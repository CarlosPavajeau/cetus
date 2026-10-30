-- What Cetus sells. A SUBSCRIPTION is the plan of an account (accounts.plan), with its documents each month
-- and its limits. A PACKAGE (yearly) or a TOPUP is bought once: its documents_included last validity_months,
-- it sets no limits and it is never assigned as an account's plan. active is whether it is still sold.
ALTER TABLE plans
    ADD COLUMN kind            TEXT    NOT NULL DEFAULT 'SUBSCRIPTION' CHECK (kind IN ('SUBSCRIPTION', 'PACKAGE', 'TOPUP')),
    ADD COLUMN validity_months INT     CHECK (validity_months > 0),
    ADD COLUMN active          BOOLEAN NOT NULL DEFAULT true,
    ADD CONSTRAINT plans_kind_lot_check CHECK (
        (kind = 'SUBSCRIPTION' AND validity_months IS NULL)
        OR (kind <> 'SUBSCRIPTION' AND documents_included IS NOT NULL AND validity_months IS NOT NULL
            AND NOT assignable AND price_monthly_cop IS NULL AND price_overage_cop IS NULL AND documents_grace IS NULL
            AND issuers_included IS NULL AND requests_per_second IS NULL));

ALTER TABLE plans ALTER COLUMN kind DROP DEFAULT;

-- A plan's price before tax, in cents as Wompi takes them. A price never changes: a new amount is a new
-- version, which closes the open one (valid_to) when it starts. Orders keep the values they applied.
CREATE TABLE plan_prices (
    id           UUID PRIMARY KEY,
    plan_code    TEXT         NOT NULL REFERENCES plans(code),
    version      INT          NOT NULL CHECK (version > 0),
    amount_cents BIGINT       NOT NULL CHECK (amount_cents >= 0),
    currency     TEXT         NOT NULL CHECK (currency = 'COP'),
    tax_rate     NUMERIC(5,4) NOT NULL CHECK (tax_rate >= 0 AND tax_rate < 1),
    valid_from   TIMESTAMPTZ  NOT NULL,
    valid_to     TIMESTAMPTZ  CHECK (valid_to > valid_from),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (plan_code, version)
);

CREATE UNIQUE INDEX uq_plan_prices_open ON plan_prices(plan_code) WHERE valid_to IS NULL;

-- The only change a price takes is its closing, once.
CREATE FUNCTION plan_prices_only_close() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'plan_prices are never deleted';
    END IF;
    IF OLD.valid_to IS NOT NULL OR NEW.valid_to IS NULL
        OR (NEW.id, NEW.plan_code, NEW.version, NEW.amount_cents, NEW.currency, NEW.tax_rate, NEW.valid_from,
            NEW.created_at)
           IS DISTINCT FROM
           (OLD.id, OLD.plan_code, OLD.version, OLD.amount_cents, OLD.currency, OLD.tax_rate, OLD.valid_from,
            OLD.created_at) THEN
        RAISE EXCEPTION 'a plan price only takes its valid_to, once';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plan_prices_immutable
    BEFORE UPDATE OR DELETE ON plan_prices
    FOR EACH ROW EXECUTE FUNCTION plan_prices_only_close();

-- Who Cetus invoices for an account's purchases. party holds it as documents store a customer
-- (identification, check digit, responsibilities, address, email), as customers does; an order keeps a copy.
CREATE TABLE billing_profiles (
    account_id            UUID PRIMARY KEY REFERENCES accounts(id),
    identification_type   TEXT        NOT NULL,
    identification_number TEXT        NOT NULL,
    legal_name            TEXT        NOT NULL,
    party                 JSONB       NOT NULL CHECK (party ->> 'email' IS NOT NULL),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
