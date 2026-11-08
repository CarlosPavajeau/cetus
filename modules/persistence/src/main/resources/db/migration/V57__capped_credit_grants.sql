-- When the subscription's carry-over cap last expired part of the lot. A credit a document held from before then is
-- lost when released, instead of growing the lot past the cap.
ALTER TABLE credit_grants ADD COLUMN capped_at TIMESTAMPTZ;
