-- Plan limits named with the qualifier last, like the rest of the code (documents_included, not
-- included_documents). V24 already ran, so the columns and their checks are renamed here.
ALTER TABLE plans RENAME COLUMN included_documents TO documents_included;
ALTER TABLE plans RENAME COLUMN included_issuers TO issuers_included;
ALTER TABLE plans RENAME COLUMN overage_price_cop TO price_overage_cop;

ALTER TABLE plans RENAME CONSTRAINT plans_included_documents_check TO plans_documents_included_check;
ALTER TABLE plans RENAME CONSTRAINT plans_included_issuers_check TO plans_issuers_included_check;
ALTER TABLE plans RENAME CONSTRAINT plans_overage_price_cop_check TO plans_price_overage_cop_check;
