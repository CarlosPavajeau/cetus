-- An account's product comes from its subscription and its package lots, no longer from an assigned plan. The
-- columns that set the limits of an assigned plan go with it; a subscription plan keeps its request limits,
-- which apply to the accounts subscribed to it.
ALTER TABLE accounts DROP COLUMN plan_id;

ALTER TABLE plans DROP CONSTRAINT plans_kind_terms_check,
    DROP COLUMN price_monthly_cop,
    DROP COLUMN documents_included,
    DROP COLUMN documents_grace,
    DROP COLUMN price_overage_cop,
    DROP COLUMN issuers_included,
    DROP COLUMN assignable,
    ADD CONSTRAINT plans_kind_terms_check CHECK (
        (kind = 'SUBSCRIPTION' AND validity_months IS NULL AND requires_kind IS NULL)
        OR (kind <> 'SUBSCRIPTION' AND validity_months IS NOT NULL AND requests_per_second IS NULL
            AND (requires_kind IS NULL OR kind = 'TOPUP')));

UPDATE plans SET active = false, requests_per_second = NULL, requests_burst = NULL WHERE code = 'FREE';
