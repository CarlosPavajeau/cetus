-- Help requests from the console. A ticket is emailed to the Cetus support mailbox, which answers by email;
-- the console only shows its status. context is a snapshot of the account (and the issuer, when the ticket
-- names one) at the moment it was opened, without secrets.
CREATE SEQUENCE support_ticket_numbers START WITH 1001;

CREATE TABLE support_tickets (
    id          UUID PRIMARY KEY,
    number      BIGINT      NOT NULL UNIQUE DEFAULT nextval('support_ticket_numbers'),
    account_id  UUID        NOT NULL REFERENCES accounts(id),
    user_id     TEXT        NOT NULL,
    user_email  TEXT        NOT NULL,
    issuer_id   UUID        REFERENCES issuers(id),
    priority    TEXT        NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    status      TEXT        NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    message     TEXT        NOT NULL,
    context     JSONB       NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_account ON support_tickets (account_id, id DESC);
CREATE INDEX idx_support_tickets_status ON support_tickets (status, id DESC);
CREATE INDEX idx_support_tickets_user ON support_tickets (user_id, created_at);

-- Uploaded one by one while the ticket is being written; ticket_id stays null until it is sent, and the
-- worker's data retention deletes those left without a ticket.
CREATE TABLE support_attachments (
    id           UUID PRIMARY KEY,
    account_id   UUID        NOT NULL REFERENCES accounts(id),
    ticket_id    UUID        REFERENCES support_tickets(id),
    file_name    TEXT        NOT NULL,
    content_type TEXT        NOT NULL,
    size         INTEGER     NOT NULL CHECK (size > 0),
    storage_key  TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_attachments_ticket ON support_attachments (ticket_id);
CREATE INDEX idx_support_attachments_unlinked ON support_attachments (created_at) WHERE ticket_id IS NULL;

CREATE TABLE feedback (
    id          UUID PRIMARY KEY,
    account_id  UUID        NOT NULL REFERENCES accounts(id),
    user_id     TEXT        NOT NULL,
    user_email  TEXT        NOT NULL,
    message     TEXT        NOT NULL,
    page        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_user ON feedback (user_id, created_at);
