-- While a Cetus admin impersonates a console user, the actions are recorded as that user's, with the admin
-- here (a Better Auth user id), so the account's activity shows who really acted.
ALTER TABLE audit_log ADD COLUMN impersonated_by TEXT;
