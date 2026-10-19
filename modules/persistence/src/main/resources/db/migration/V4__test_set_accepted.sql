-- =====================================================================
-- When the DIAN reports that an issuer's test set was accepted (habilitación done). From then on it
-- refuses every document sent to that set, so the API stops taking test invoices for the issuer.
-- =====================================================================

ALTER TABLE issuer_software_credentials ADD COLUMN test_set_accepted_at TIMESTAMPTZ;

-- Sets the DIAN already reported as accepted before this column existed.
UPDATE issuer_software_credentials c
SET test_set_accepted_at = accepted.at
FROM (
    SELECT d.issuer_id, s.status_message, min(s.created_at) AS at
    FROM dian_submissions s
    JOIN documents d ON d.id = s.document_id
    WHERE s.operation = 'GetStatusZip' AND s.status_message ILIKE 'Set de prueba con identificador % se encuentra Aceptado%'
    GROUP BY d.issuer_id, s.status_message
) accepted
WHERE accepted.issuer_id = c.issuer_id
  AND c.test_set_id IS NOT NULL
  AND accepted.status_message ILIKE '%' || c.test_set_id || '%';
