-- What each plan includes. A null is no limit (or a price agreed by contract); FREE is an account
-- without a plan yet, only measured. A partner contract gets its own row, added by hand.
CREATE TABLE plans (
    code                TEXT PRIMARY KEY,
    name                TEXT        NOT NULL,
    price_monthly_cop   BIGINT      CHECK (price_monthly_cop >= 0),
    included_documents  INT         CHECK (included_documents > 0),
    overage_price_cop   INT         CHECK (overage_price_cop >= 0),
    included_issuers    INT         CHECK (included_issuers > 0),
    requests_per_minute INT         CHECK (requests_per_minute > 0),
    assignable          BOOLEAN     NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans (code, name, price_monthly_cop, included_documents, overage_price_cop, included_issuers,
                   requests_per_minute)
VALUES ('FREE', 'Sin plan', NULL, NULL, NULL, NULL, NULL),
       ('INICIAL', 'Inicial', 39000, 200, 150, 1, 30),
       ('CRECIMIENTO', 'Crecimiento', 149000, 2000, 80, 3, 120),
       ('ESCALA', 'Escala', 399000, 10000, 45, 10, 300),
       ('SOCIOS', 'Socios', NULL, NULL, NULL, NULL, NULL);

ALTER TABLE accounts ADD CONSTRAINT accounts_plan_fkey FOREIGN KEY (plan) REFERENCES plans(code);

-- Billable documents: LIVE documents the DIAN accepted, counted in the Colombian calendar month
-- (YYYY-MM) of their acceptance. The worker adds one in the transaction that accepts the document.
CREATE TABLE usage_counters (
    account_id    UUID        NOT NULL REFERENCES accounts(id),
    period        TEXT        NOT NULL CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    document_type TEXT        NOT NULL CHECK (document_type IN ('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE')),
    count         INT         NOT NULL CHECK (count >= 0),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, period, document_type)
);

INSERT INTO usage_counters (account_id, period, document_type, count)
SELECT account_id, to_char(validated_at AT TIME ZONE 'America/Bogota', 'YYYY-MM'), document_type, count(*)
FROM documents
WHERE environment = 'LIVE' AND status = 'ACCEPTED' AND validated_at IS NOT NULL
GROUP BY 1, 2, 3;
