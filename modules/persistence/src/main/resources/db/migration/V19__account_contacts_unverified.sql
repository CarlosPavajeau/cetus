-- A category can wait for its first verified address: email and verified_at stay null until an address
-- follows its verification link (new accounts start with the owner's address pending, not verified).
ALTER TABLE account_contacts
    ALTER COLUMN email DROP NOT NULL,
    ALTER COLUMN verified_at DROP NOT NULL;
