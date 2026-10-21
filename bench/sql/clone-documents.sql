-- Gives every benchmark issuer a document history, so the console's lists and searches run against a
-- realistic table instead of a handful of rows. Each issuer's ACCEPTED warm-up invoice (bench/seed.ts) is
-- copied :per_issuer times, with its lines and taxes, spread over the last 180 days. Copies are numbered
-- from 10,000,000, above the issuer's range, so they never collide with what a run issues.
-- The columns are read from the catalog, so new migrations do not break this script.
--
--   psql -v per_issuer=4000 -f bench/sql/clone-documents.sql
\set ON_ERROR_STOP on
SET search_path = billing;
SET bench.per_issuer = :'per_issuer';

DO $$
DECLARE
    per_issuer int := current_setting('bench.per_issuer')::int;
    doc_columns text;
    line_columns text;
    tax_columns text;
BEGIN
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO doc_columns
    FROM information_schema.columns
    WHERE table_schema = 'billing' AND table_name = 'documents'
      AND column_name NOT IN ('id', 'number', 'cufe', 'customer', 'created_at', 'updated_at');
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO line_columns
    FROM information_schema.columns
    WHERE table_schema = 'billing' AND table_name = 'document_lines' AND column_name NOT IN ('id', 'document_id');
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO tax_columns
    FROM information_schema.columns
    WHERE table_schema = 'billing' AND table_name = 'document_taxes'
      AND column_name NOT IN ('id', 'document_id', 'line_id');

    -- One template per issuer: its first accepted invoice.
    CREATE TEMP TABLE templates ON COMMIT DROP AS
    SELECT DISTINCT ON (issuer_id) id, issuer_id
    FROM documents
    WHERE status = 'ACCEPTED' AND document_type = 'INVOICE' AND number < 10000000
    ORDER BY issuer_id, created_at;

    -- Ids are UUID v7 of created_at, like the API's: the console pages by id, newest first.
    CREATE TEMP TABLE copies ON COMMIT DROP AS
    SELECT template_id, (lpad(to_hex((extract(epoch FROM created_at) * 1000)::bigint), 12, '0') || '7'
               || substr(r, 14, 3) || '8' || substr(r, 18, 3) || substr(r, 21, 12))::uuid AS id,
           number, created_at, n
    FROM (SELECT t.id AS template_id, 10000000 + n AS number, now() - random() * interval '180 days' AS created_at,
                 n, replace(gen_random_uuid()::text, '-', '') AS r
          FROM templates t
          CROSS JOIN generate_series(1, per_issuer) AS n
          WHERE NOT EXISTS (SELECT 1 FROM documents d WHERE d.issuer_id = t.issuer_id AND d.number >= 10000000)) c;

    EXECUTE format(
        'INSERT INTO documents (id, number, cufe, customer, created_at, updated_at, %1$s)
         SELECT c.id, c.number, md5(c.id::text) || md5(random()::text) || md5(clock_timestamp()::text),
                jsonb_set(d.customer, ''{legalName}'', to_jsonb(''Cliente '' || (c.n %% 500))),
                c.created_at, c.created_at, %2$s
         FROM copies c JOIN documents d ON d.id = c.template_id',
        doc_columns, (SELECT string_agg('d.' || x, ', ') FROM unnest(string_to_array(doc_columns, ', ')) x));

    CREATE TEMP TABLE line_copies ON COMMIT DROP AS
    SELECT c.id AS document_id, l.id AS template_line_id, gen_random_uuid() AS id
    FROM copies c JOIN document_lines l ON l.document_id = c.template_id;

    EXECUTE format(
        'INSERT INTO document_lines (id, document_id, %1$s)
         SELECT lc.id, lc.document_id, %2$s
         FROM line_copies lc JOIN document_lines l ON l.id = lc.template_line_id',
        line_columns, (SELECT string_agg('l.' || x, ', ') FROM unnest(string_to_array(line_columns, ', ')) x));

    EXECUTE format(
        'INSERT INTO document_taxes (id, document_id, line_id, %1$s)
         SELECT gen_random_uuid(), c.id, lc.id, %2$s
         FROM copies c
         JOIN document_taxes t ON t.document_id = c.template_id
         LEFT JOIN line_copies lc ON lc.document_id = c.id AND lc.template_line_id = t.line_id',
        tax_columns, (SELECT string_agg('t.' || x, ', ') FROM unnest(string_to_array(tax_columns, ', ')) x));

    RAISE NOTICE 'cloned % documents for % issuers', (SELECT count(*) FROM copies), (SELECT count(*) FROM templates);
END $$;

ANALYZE documents;
ANALYZE document_lines;
ANALYZE document_taxes;
