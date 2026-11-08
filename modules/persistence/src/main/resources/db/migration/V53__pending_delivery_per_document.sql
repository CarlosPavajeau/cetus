-- At most one pending delivery per document: two runs of the same job, or a resend racing the first delivery,
-- used to create one each and email the customer twice under different idempotency keys. Older duplicates left by
-- that race give way to the newest, the one the worker picks up.
UPDATE document_deliveries d
SET status = 'FAILED', error = 'Duplicate of a later pending delivery', updated_at = now()
WHERE d.status = 'PENDING'
  AND EXISTS (SELECT 1 FROM document_deliveries n
              WHERE n.document_id = d.document_id AND n.status = 'PENDING'
                AND (n.created_at, n.id) > (d.created_at, d.id));

CREATE UNIQUE INDEX uq_document_deliveries_pending ON document_deliveries(document_id) WHERE status = 'PENDING';
