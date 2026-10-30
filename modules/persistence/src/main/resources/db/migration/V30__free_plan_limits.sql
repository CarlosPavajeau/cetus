-- A plan with a grace stops taking production documents once the month reaches its included ones plus the
-- grace; credit notes are always taken, since they are the only way to correct an invoice. A null grace is
-- the soft limit of V24: documents above the plan are billed as overage and never blocked.
ALTER TABLE plans ADD COLUMN documents_grace INT CHECK (documents_grace >= 0),
    ADD CONSTRAINT plans_documents_grace_included_check CHECK (documents_grace IS NULL OR documents_included IS NOT NULL);

-- FREE stops being unmetered: enough production documents to try Cetus, without overage.
UPDATE plans
SET name                = 'Gratis',
    price_monthly_cop   = 0,
    documents_included  = 25,
    documents_grace     = 5,
    price_overage_cop   = NULL,
    issuers_included    = 1,
    requests_per_second = 1,
    requests_burst      = 10,
    updated_at          = now()
WHERE code = 'FREE';
