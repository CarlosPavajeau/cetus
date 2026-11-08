-- A payment Wompi approved for an order that could not take it (canceled, or already paid by another payment) is
-- given back through Wompi (RETURN). It belongs to its transaction, not to the order: it revokes no credits, leaves
-- the order as it was and does not count among the order's live reversals. A transaction is given back once.
ALTER TABLE payment_reversals DROP CONSTRAINT payment_reversals_kind_check;
ALTER TABLE payment_reversals ADD CONSTRAINT payment_reversals_kind_check
    CHECK (kind IN ('REFUND', 'CHARGEBACK', 'RETURN'));
-- V41's unnamed CHECK (kind = 'REFUND' OR mode = 'EXTERNAL'): Cetus asks Wompi for refunds and returns.
ALTER TABLE payment_reversals DROP CONSTRAINT payment_reversals_check;
ALTER TABLE payment_reversals ADD CONSTRAINT payment_reversals_wompi_check
    CHECK (kind IN ('REFUND', 'RETURN') OR mode = 'EXTERNAL');
ALTER TABLE payment_reversals ADD CONSTRAINT payment_reversals_return_check
    CHECK (kind <> 'RETURN' OR (mode = 'WOMPI' AND credits_revoked IS NULL AND debt_cents IS NULL));

DROP INDEX uq_payment_reversals_order_live;
CREATE UNIQUE INDEX uq_payment_reversals_order_live ON payment_reversals(order_id)
    WHERE status IN ('REQUESTED', 'SUBMITTED') AND kind <> 'RETURN';
CREATE UNIQUE INDEX uq_payment_reversals_return ON payment_reversals(provider_transaction_id)
    WHERE kind = 'RETURN';
