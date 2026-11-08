-- When the range's current verification was asked for. The job writes its answer only while the range still
-- waits for that same request, so a slow or repeated run never overwrites a newer one; a request left waiting
-- too long can be made again.
ALTER TABLE numbering_ranges ADD COLUMN verification_requested_at TIMESTAMPTZ;

UPDATE numbering_ranges SET verification_requested_at = now() WHERE verification_status = 'PENDING';
