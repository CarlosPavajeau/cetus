-- The console's document list and search (DocumentEntity.pageForAccount).
--
-- 1. Text search: ILIKE '%...%' over the number, the external reference and the customer's identification
--    and name read the whole table (every account) on each search. A trigram index over one expression
--    holding the four fields serves any substring of three or more characters. The fields are joined with a
--    newline, which a search cannot contain (it rejects control characters), so no match spans two fields.
--    The expression must stay identical to DocumentEntity.SEARCH_TEXT or the planner will not use the index.
--
--    pg_trgm needs CREATE on the database, which cetus_billing does not have: an administrator creates it
--    once, in this schema (infra/postgres/01-schemas.sql locally; by hand in PlanetScale):
--        CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA billing;
--    Here it only checks that it is there.
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA billing;

CREATE INDEX idx_documents_search ON documents USING gin ((
    prefix || number::text || E'\n' || coalesce(external_reference, '') || E'\n'
        || coalesce(customer ->> 'identificationNumber', '') || E'\n' || coalesce(customer ->> 'legalName', '')
) gin_trgm_ops);

-- 2. Pagination: newest first by id (UUID v7) within the account. Without it Postgres walks the primary key
--    backwards skipping other accounts' rows, which gets slower for a small account the more the rest grow.
CREATE INDEX idx_documents_account_id ON documents(account_id, id DESC);
