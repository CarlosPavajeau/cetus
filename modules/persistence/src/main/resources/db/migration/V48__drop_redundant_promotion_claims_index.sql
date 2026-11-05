-- UNIQUE (promotion_id, account_id) already serves the lookups by promotion.
DROP INDEX idx_promotion_claims_promotion;
