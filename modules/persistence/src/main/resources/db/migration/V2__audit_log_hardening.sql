-- =====================================================================
-- Audit log: who changed what on an account, and from where. Append-only.
-- =====================================================================

ALTER TABLE audit_log
    ADD COLUMN ip_address INET,
    ADD COLUMN user_agent TEXT;

CREATE INDEX idx_audit_log_account_action ON audit_log(account_id, action, created_at DESC);

-- Append-only, enforced even for the table owner (cetus_billing owns it through Flyway,
-- so revoking privileges alone is not enough).
CREATE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update_delete
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();

CREATE TRIGGER audit_log_no_truncate
    BEFORE TRUNCATE ON audit_log
    FOR EACH STATEMENT EXECUTE FUNCTION audit_log_is_append_only();
