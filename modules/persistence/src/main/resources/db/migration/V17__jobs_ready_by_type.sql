-- The worker claims each job type separately, up to that type's limit (JobClaimer). Ordered by run_at alone,
-- looking for one type walked past every ready job of the others: with 5000 documents waiting, finding no
-- delivery read 604 pages, on every claim, and a claim follows every job that ends. Led by the type, it reads
-- two. The claim was the only query using the old index.
CREATE INDEX idx_jobs_ready_type ON jobs(job_type, run_at) WHERE status IN ('PENDING', 'RUNNING');
DROP INDEX idx_jobs_ready;
