-- The catalogs' list and search (CustomerEntity.page, ProductEntity.page), as V14 does for documents.
--
-- 1. Text search: one trigram index per table over an expression joining the searched fields with a newline,
--    which a search cannot contain, so no match spans two fields. The expressions must stay identical to
--    CustomerEntity.SEARCH_TEXT and ProductEntity.SEARCH_TEXT or the planner will not use them. A search of
--    one or two characters has no trigram and walks the account's rows by the index below instead, stopping
--    as soon as the page is full. pg_trgm already exists (V14).
CREATE INDEX idx_customers_search ON customers USING gin ((
    legal_name || E'\n' || identification_number
) gin_trgm_ops);

CREATE INDEX idx_products_search ON products USING gin ((
    code || E'\n' || description
) gin_trgm_ops);

-- 2. Pagination: newest first by id (UUID v7) within the account and environment.
CREATE INDEX idx_customers_account_id ON customers(account_id, environment, id DESC);

CREATE INDEX idx_products_account_id ON products(account_id, environment, id DESC);
