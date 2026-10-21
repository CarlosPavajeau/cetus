-- The Cetus team suspends and reactivates accounts with a mandatory reason. The latest change stays on the
-- account (the console shows the reason to its members); the full history is in audit_log.
ALTER TABLE accounts
    ADD COLUMN status_reason     TEXT,
    ADD COLUMN status_changed_at TIMESTAMPTZ,
    ADD COLUMN status_changed_by TEXT;
