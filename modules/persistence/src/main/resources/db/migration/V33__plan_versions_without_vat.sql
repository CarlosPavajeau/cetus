-- Cetus' holder is not responsible for VAT: the catalog's prices are final and carry no tax. Versions never
-- change, so each open public version closes and a new one takes its same terms with a rate of 0. tax_rate and
-- tax_included stay for when the tax status changes. One instant ends the old versions and starts the new
-- ones; clock_timestamp() keeps it after V32's valid_from even when both run in one transaction.
CREATE TEMPORARY TABLE vat_cut ON COMMIT DROP AS SELECT clock_timestamp() AS at;

CREATE TEMPORARY TABLE closed_versions ON COMMIT DROP AS
SELECT v.*
FROM plan_versions v
WHERE v.account_id IS NULL AND v.valid_to IS NULL AND v.tax_rate <> 0;

UPDATE plan_versions v
SET valid_to = (SELECT at FROM vat_cut)
FROM closed_versions c
WHERE v.id = c.id;

INSERT INTO plan_versions (plan_id, version, price_cents, tax_included, tax_rate, documents_included,
                           issuers_included, price_overage_cents, valid_from)
SELECT c.plan_id,
       (SELECT max(v.version) + 1 FROM plan_versions v WHERE v.plan_id = c.plan_id),
       c.price_cents,
       true,
       0,
       c.documents_included,
       c.issuers_included,
       c.price_overage_cents,
       (SELECT at FROM vat_cut)
FROM closed_versions c;
