-- =====================================================================
-- Credit notes. A note points at the invoice it corrects through referenced_document_id (V1) and
-- records the correction concept (annex table 13.2.4) and the reason the issuer gave.
-- =====================================================================

ALTER TABLE documents
    ADD COLUMN correction_concept TEXT CHECK (correction_concept IN (
        'PARTIAL_RETURN', 'CANCELLATION', 'REBATE', 'PRICE_ADJUSTMENT', 'EARLY_PAYMENT_DISCOUNT', 'VOLUME_DISCOUNT')),
    ADD COLUMN correction_description TEXT;

-- The balance of an invoice is computed from the notes that reference it.
CREATE INDEX idx_documents_referenced ON documents(referenced_document_id) WHERE referenced_document_id IS NOT NULL;
