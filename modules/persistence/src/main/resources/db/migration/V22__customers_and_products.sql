-- Catalogs an account keeps to fill in its documents, one per environment like its API keys. A document
-- still stores its own copy of the customer and lines, so editing or deleting an entry never changes one.

-- party holds the customer as documents store it (identification, check digit, tax scheme, address);
-- the identification and the name are repeated as columns to be unique and searchable.
CREATE TABLE customers (
    id                    UUID PRIMARY KEY,
    account_id            UUID        NOT NULL REFERENCES accounts(id),
    environment           TEXT        NOT NULL CHECK (environment IN ('SANDBOX', 'TEST', 'LIVE')),
    identification_type   TEXT        NOT NULL,
    identification_number TEXT        NOT NULL,
    legal_name            TEXT        NOT NULL,
    party                 JSONB       NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id, environment, identification_type, identification_number)
);

-- taxes is the list of {type, percent} a line of the product carries; an empty list is an excluded item.
CREATE TABLE products (
    id          UUID PRIMARY KEY,
    account_id  UUID          NOT NULL REFERENCES accounts(id),
    environment TEXT          NOT NULL CHECK (environment IN ('SANDBOX', 'TEST', 'LIVE')),
    code        TEXT          NOT NULL,
    description TEXT          NOT NULL,
    unit_code   TEXT          NOT NULL,
    unit_price  NUMERIC(20,6) NOT NULL CHECK (unit_price >= 0),
    taxes       JSONB         NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (account_id, environment, code)
);
