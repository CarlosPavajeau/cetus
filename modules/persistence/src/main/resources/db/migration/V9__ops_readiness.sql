-- =====================================================================
-- Operational alerts and numbering range verification.
-- =====================================================================

-- Conditions the operators were told about (dead jobs, stuck documents, expiring certificates, ranges
-- running out). Each is emailed once; the ones that persist are repeated at most once a day, and a row
-- is deleted when its condition clears, so it is reported again if it comes back.
CREATE TABLE ops_alerts (
    alert_key       TEXT PRIMARY KEY,           -- "<category>:<id>"
    category        TEXT        NOT NULL,
    summary         TEXT        NOT NULL,
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ops_alerts_category ON ops_alerts(category);

-- GetNumberingRange: the DIAN's own record of an invoice range (prefix, numbers, technical key). A typo in
-- the technical key makes every CUFE invalid, so the worker compares both before the issuer invoices.
ALTER TABLE numbering_ranges
    ADD COLUMN verification_status TEXT CHECK (verification_status IN ('PENDING', 'VERIFIED', 'MISMATCH', 'ERROR')),
    ADD COLUMN verified_at         TIMESTAMPTZ,
    ADD COLUMN verification_error  TEXT;

CREATE INDEX idx_jobs_reference ON jobs(reference_id);
