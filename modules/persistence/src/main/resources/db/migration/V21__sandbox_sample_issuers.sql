-- Every account starts with a SANDBOX sample issuer, ready to issue (SandboxIssuers creates it for new
-- accounts). Accounts created before the sandbox get theirs here, with its ranges for every document
-- type. Sandbox issuers keep no secrets, so plain SQL is enough.
CREATE TEMPORARY TABLE sandbox_samples ON COMMIT DROP AS
SELECT gen_random_uuid() AS issuer_id, a.id AS account_id
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM issuers i
                  WHERE i.account_id = a.id AND i.environment = 'SANDBOX' AND i.nit = '900999999');

INSERT INTO issuers (id, account_id, environment, nit, check_digit, legal_name, trade_name, person_type,
                     tax_level_codes, address, email, operation_mode, status)
SELECT issuer_id, account_id, 'SANDBOX', '900999999', '4', 'Empresa de Ejemplo SAS', 'Ejemplo', 'LEGAL_ENTITY',
       'O-13',
       '{"municipalityCode": "11001", "cityName": "Bogotá, D.C.", "departmentCode": "11", "departmentName": "Bogotá", "postalCode": "110111", "line": "Carrera 7 # 71-21", "countryCode": "CO", "countryName": "Colombia"}',
       'facturas@example.com', 'OWN_SOFTWARE', 'ENABLED'
FROM sandbox_samples;

INSERT INTO numbering_ranges (id, issuer_id, document_type, resolution_number, resolution_date, prefix,
                              range_from, range_to, next_number, valid_from, valid_to)
SELECT gen_random_uuid(), s.issuer_id, r.document_type, r.resolution_number,
       CASE WHEN r.resolution_number IS NULL THEN NULL ELSE current_date END,
       r.prefix, 1, 999999999, 1, current_date, current_date + INTERVAL '10 years'
FROM sandbox_samples s
CROSS JOIN (VALUES ('INVOICE', 'SIM', '18760000001'),
                   ('CREDIT_NOTE', 'NCS', NULL),
                   ('DEBIT_NOTE', 'NDS', NULL)) AS r(document_type, prefix, resolution_number);
