-- One-off, after V18: points every category of the accounts created before contacts existed to the
-- organization's owner, as verified. New accounts get them on bootstrap (AccountResource).
--
-- It reads the "auth" schema, which cetus_billing cannot: run it as a role that sees both schemas
-- (the database owner), e.g. psql "$OWNER_DATABASE_URL" -f scripts/backfill-account-contacts.sql
-- Safe to run again: categories that already have a contact are left alone.
INSERT INTO billing.account_contacts (id, account_id, category, email, verified_at)
SELECT gen_random_uuid(), a.id, c.category, lower(trim(owner.email)), now()
FROM billing.accounts a
CROSS JOIN (VALUES ('TECHNICAL'), ('FISCAL'), ('BILLING')) AS c(category)
JOIN LATERAL (
    SELECT u.email
    FROM auth.member m
    JOIN auth."user" u ON u.id = m.user_id
    WHERE m.organization_id = a.organization_id AND m.role = 'owner'
    ORDER BY m.created_at
    LIMIT 1
) owner ON true
ON CONFLICT (account_id, category) DO NOTHING;
