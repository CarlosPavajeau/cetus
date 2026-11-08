-- A void that arrived while a refund of its paid order was live: its chargeback waits for that refund to end, and
-- this marks which transaction it was.
ALTER TABLE payment_transactions ADD COLUMN chargeback_waiting BOOLEAN NOT NULL DEFAULT false;

-- Bumped each time an admin queues a failed event again: a run that started before only resolves the event of its
-- own generation, so it cannot close one its new job has yet to process.
ALTER TABLE inbound_webhook_events ADD COLUMN generation INT NOT NULL DEFAULT 0;
