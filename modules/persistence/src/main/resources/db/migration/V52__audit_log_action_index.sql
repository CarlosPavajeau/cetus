-- The ops checks look for one action across every account, such as DOCUMENT_LATE_VERDICT in the last week.
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at);
