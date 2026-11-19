-- Invoices issued together from a file. The API validates the whole batch and stores its items; the worker turns
-- them into documents in blocks (EXPAND_BATCH) and the batch closes when its last document reaches a final status.
CREATE TABLE document_batches (
    id               UUID PRIMARY KEY,
    account_id       UUID        NOT NULL REFERENCES accounts(id),
    issuer_id        UUID        NOT NULL REFERENCES issuers(id),
    environment      TEXT        NOT NULL CHECK (environment IN ('SANDBOX', 'TEST', 'LIVE')),
    status           TEXT        NOT NULL
        CHECK (status IN ('RECEIVED', 'EXPANDING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED')),
    source           TEXT        NOT NULL CHECK (source IN ('CONSOLE', 'API')),
    items            INTEGER     NOT NULL CHECK (items BETWEEN 1 AND 1000),
    file_name        TEXT,
    file_sha256      TEXT CHECK (file_sha256 ~ '^[0-9a-f]{64}$'),
    created_by       TEXT,
    created_by_email TEXT,
    -- Why the expansion stopped before creating every document; only on a PARTIAL or FAILED batch.
    stop_reason      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    expanded_at      TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((status IN ('COMPLETED', 'PARTIAL', 'FAILED')) = (completed_at IS NOT NULL))
);

CREATE INDEX idx_document_batches_account ON document_batches (account_id, environment, id DESC);
CREATE INDEX idx_document_batches_file ON document_batches (account_id, issuer_id, environment, file_sha256, created_at)
    WHERE file_sha256 IS NOT NULL;
CREATE INDEX idx_document_batches_open ON document_batches (account_id)
    WHERE status IN ('RECEIVED', 'EXPANDING', 'PROCESSING');

-- payload holds the item as the API resolved it (customer, payment, lines); it is cleared once the item has its
-- document, or once the expansion stops, so customer data does not stay here. The reference stays for the result.
CREATE TABLE document_batch_items (
    batch_id  UUID    NOT NULL REFERENCES document_batches(id) ON DELETE CASCADE,
    position  INTEGER NOT NULL CHECK (position >= 0),
    reference TEXT    NOT NULL,
    payload   JSONB,
    PRIMARY KEY (batch_id, position),
    UNIQUE (batch_id, reference)
);

CREATE INDEX idx_document_batch_items_pending ON document_batch_items (batch_id, position) WHERE payload IS NOT NULL;

ALTER TABLE documents
    ADD COLUMN batch_id       UUID REFERENCES document_batches(id),
    ADD COLUMN batch_position INTEGER,
    ADD CONSTRAINT documents_batch_position_check CHECK ((batch_id IS NULL) = (batch_position IS NULL)),
    ADD CONSTRAINT documents_batch_position_key UNIQUE (batch_id, batch_position);
