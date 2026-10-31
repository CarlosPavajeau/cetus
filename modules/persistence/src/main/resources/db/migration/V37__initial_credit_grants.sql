-- Accounts that already issue in production start with credits: a promotional lot of the public EMPRENDEDOR
-- version in force, 300 documents for 12 months, which counts as their package (one production issuer and its
-- grace margin). An account above that keeps its issuers; it only cannot add more. source_id is the account, so
-- the lot is granted once.
WITH version AS (
    SELECT v.id, v.documents_included
    FROM plan_versions v JOIN plans p ON p.id = v.plan_id
    WHERE p.code = 'EMPRENDEDOR' AND v.account_id IS NULL AND v.valid_to IS NULL
), granted AS (
    INSERT INTO credit_grants (account_id, plan_version_id, source_type, source_id, quantity, remaining, expires_at,
                               status)
    SELECT a.id, version.id, 'PROMO', a.id, version.documents_included, version.documents_included,
           now() + interval '12 months', 'ACTIVE'
    FROM accounts a CROSS JOIN version
    WHERE EXISTS (SELECT 1 FROM issuers i WHERE i.account_id = a.id AND i.environment = 'LIVE')
      AND NOT EXISTS (SELECT 1 FROM credit_grants g WHERE g.account_id = a.id)
    RETURNING id, account_id, quantity
)
INSERT INTO credit_movements (account_id, grant_id, type, quantity, actor_type, reason)
SELECT account_id, id, 'GRANT', quantity, 'SYSTEM', 'Lote inicial de créditos'
FROM granted;
