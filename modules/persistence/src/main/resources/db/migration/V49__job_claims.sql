-- Each claim gets its own id, and only the run holding it may finish, retry or extend the job: a run whose lease
-- expired and was claimed again by another worker writes nothing.
ALTER TABLE jobs ADD COLUMN claim_id UUID;
