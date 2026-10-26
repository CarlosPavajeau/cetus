-- W3C traceparent of whatever enqueued the job, so the worker continues its trace.
ALTER TABLE jobs ADD COLUMN trace_context TEXT;
