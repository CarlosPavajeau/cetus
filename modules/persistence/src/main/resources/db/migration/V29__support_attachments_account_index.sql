-- Each upload counts the account's attachments of the last hour (SupportTickets.upload); attachments sent
-- with a ticket stay, so without this the count scans every account's history.
CREATE INDEX idx_support_attachments_account ON support_attachments (account_id, created_at);
