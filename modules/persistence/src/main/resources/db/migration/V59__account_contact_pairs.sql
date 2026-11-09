-- The columns that only make sense together. A pending address may wait without a link: the worker writes the
-- link's hash when it sends the email, on one of the categories a request shares.
ALTER TABLE account_contacts
    ADD CONSTRAINT account_contacts_verified_check CHECK ((email IS NULL) = (verified_at IS NULL)),
    ADD CONSTRAINT account_contacts_pending_check CHECK ((pending_email IS NULL) = (pending_requested_at IS NULL)),
    ADD CONSTRAINT account_contacts_link_check CHECK (
        (pending_token_hash IS NULL) = (pending_expires_at IS NULL)
        AND (pending_token_hash IS NULL OR pending_email IS NOT NULL));
