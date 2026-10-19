-- =====================================================================
-- Delivery of validated documents to the customer (annex section 9): one row per attempt to hand the
-- AttachedDocument and the PDF over a channel. Email is the only channel for now; the provider's message
-- id matches the delivery events (delivered, bounced, complained) its webhook reports.
-- =====================================================================

CREATE TABLE document_deliveries (
    id                   UUID PRIMARY KEY,
    document_id          UUID        NOT NULL REFERENCES documents(id),
    channel              TEXT        NOT NULL DEFAULT 'EMAIL' CHECK (channel IN ('EMAIL')),
    recipient            TEXT,
    status               TEXT        NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING','SENT','DELIVERED','BOUNCED','COMPLAINED','SKIPPED','FAILED')),
    attempts             INT         NOT NULL DEFAULT 0,
    provider_message_id  TEXT,
    error                TEXT,
    sent_at              TIMESTAMPTZ,
    last_event_at        TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_document_deliveries_document ON document_deliveries(document_id, created_at);
CREATE UNIQUE INDEX uq_document_deliveries_message ON document_deliveries(provider_message_id)
    WHERE provider_message_id IS NOT NULL;
