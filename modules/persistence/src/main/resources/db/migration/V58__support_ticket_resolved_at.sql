-- When the ticket was last resolved; reopening it clears it.
ALTER TABLE support_tickets ADD COLUMN resolved_at TIMESTAMPTZ;
UPDATE support_tickets SET resolved_at = updated_at WHERE status = 'RESOLVED';
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_resolved_check
    CHECK ((status = 'RESOLVED') = (resolved_at IS NOT NULL));
