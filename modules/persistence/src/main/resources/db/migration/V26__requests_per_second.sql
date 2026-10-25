-- Production API limits by the second, with a burst, instead of by the minute. They only protect the
-- platform: plans are told apart by their documents, so even the smallest one keeps a batch at the end of
-- the day and its status checks without 429s. A null pair keeps the per-key limit (10/s) of the API.
ALTER TABLE plans DROP COLUMN requests_per_minute,
    ADD COLUMN requests_per_second INT CHECK (requests_per_second > 0),
    ADD COLUMN requests_burst      INT CHECK (requests_burst > 0),
    ADD CONSTRAINT plans_requests_pair_check CHECK ((requests_per_second IS NULL) = (requests_burst IS NULL));

UPDATE plans SET requests_per_second = 5, requests_burst = 20 WHERE code = 'INICIAL';
UPDATE plans SET requests_per_second = 10, requests_burst = 40 WHERE code = 'CRECIMIENTO';
UPDATE plans SET requests_per_second = 20, requests_burst = 60 WHERE code = 'ESCALA';

-- An account that needs more than its plan gets its own limits, set by hand; null follows the plan.
ALTER TABLE accounts
    ADD COLUMN requests_per_second INT CHECK (requests_per_second > 0),
    ADD COLUMN requests_burst      INT CHECK (requests_burst > 0),
    ADD CONSTRAINT accounts_requests_pair_check CHECK ((requests_per_second IS NULL) = (requests_burst IS NULL));
