-- GetNumberingRange only knows production resolutions: habilitación numbers from the DIAN's shared test
-- range (SETP), which is not registered per NIT and always answers 301. Ranges of TEST issuers are no
-- longer verified, so their earlier outcome is cleared (and stops raising the RANGE_UNVERIFIED alert).
UPDATE numbering_ranges
SET verification_status = NULL, verified_at = NULL, verification_error = NULL
WHERE issuer_id IN (SELECT id FROM issuers WHERE environment = 'TEST');

DELETE FROM ops_alerts
WHERE category = 'range_unverified'
  AND alert_key IN (SELECT 'range_unverified:' || r.id FROM numbering_ranges r
                    JOIN issuers i ON i.id = r.issuer_id WHERE i.environment = 'TEST');
