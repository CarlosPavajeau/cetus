-- A return Wompi left unanswered, or refused, is approved once a person saw it given back, in Wompi's dashboard or
-- elsewhere: like a refund, it then becomes EXTERNAL. It still revokes no credits and leaves no debt.
ALTER TABLE payment_reversals DROP CONSTRAINT payment_reversals_return_check;
ALTER TABLE payment_reversals ADD CONSTRAINT payment_reversals_return_check
    CHECK (kind <> 'RETURN' OR (credits_revoked IS NULL AND debt_cents IS NULL));
