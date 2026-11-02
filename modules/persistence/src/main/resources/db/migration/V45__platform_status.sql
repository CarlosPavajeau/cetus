-- Why a call to the DIAN got no answer, so the status page can tell a DIAN outage from rejections. Calls that got an
-- answer, and those recorded before this column, leave it empty.
ALTER TABLE dian_submissions
    ADD COLUMN error_kind TEXT CHECK (error_kind IN ('TIMEOUT', 'TRANSPORT', 'FAULT'));

CREATE INDEX idx_dian_submissions_created ON dian_submissions(created_at);

-- What the Cetus team tells customers on the status page and in the console while something fails.
CREATE TABLE status_incidents (
    id          UUID PRIMARY KEY,
    component   TEXT        NOT NULL CHECK (component IN ('API', 'PROCESSING', 'DIAN_LIVE', 'DIAN_TEST')),
    impact      TEXT        NOT NULL CHECK (impact IN ('DEGRADED', 'OUTAGE')),
    title       TEXT        NOT NULL,
    message     TEXT        NOT NULL,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    created_by  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_incidents_open ON status_incidents(started_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX idx_status_incidents_resolved ON status_incidents(resolved_at DESC);
