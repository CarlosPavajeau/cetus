-- Wakes the worker as soon as a job is ready instead of on its next poll (JobListener LISTENs on this channel).
-- Postgres delivers a NOTIFY when the enqueuing transaction commits, so the worker never sees a job its
-- transaction rolled back, and drops identical notifications of one transaction, so a batch is one wake-up.
-- Every insert is announced, delayed ones included: their run_at comes from the application's clock, which
-- cannot be compared reliably with the database's. An early wake-up only costs a claim that finds nothing;
-- the worker's poll runs delayed jobs (and retries, which are updates) when they are due.
CREATE FUNCTION notify_job_ready() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM pg_notify('billing_jobs', '');
    RETURN NULL;
END;
$$;

CREATE TRIGGER jobs_notify_ready
    AFTER INSERT ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION notify_job_ready();
