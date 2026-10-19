-- =====================================================================
-- Debit notes. They reference the invoice they add to like credit notes do, with the correction
-- concepts of annex table 13.2.5, so the concept is now checked against the note's type.
-- =====================================================================

ALTER TABLE documents DROP CONSTRAINT documents_correction_concept_check;

ALTER TABLE documents
    ADD CONSTRAINT documents_correction_concept_check CHECK (
        correction_concept IS NULL
        OR (document_type = 'CREDIT_NOTE' AND correction_concept IN (
            'PARTIAL_RETURN', 'CANCELLATION', 'REBATE', 'PRICE_ADJUSTMENT', 'EARLY_PAYMENT_DISCOUNT', 'VOLUME_DISCOUNT'))
        OR (document_type = 'DEBIT_NOTE' AND correction_concept IN ('INTEREST', 'EXPENSES', 'VALUE_CHANGE', 'OTHER')));
