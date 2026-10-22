-- The worker deletes API key requests older than cetus.retention.api-key-requests (DataRetention), in batches
-- by created_at. The table only grows in time order (one row per /v1 request), which is what BRIN indexes
-- best: a few pages for the whole table and next to nothing per insert, where a B-tree would add a write to
-- every request.
CREATE INDEX idx_api_key_requests_created ON api_key_requests USING brin (created_at);
