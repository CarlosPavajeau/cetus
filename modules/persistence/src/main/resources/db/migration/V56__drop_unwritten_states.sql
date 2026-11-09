-- States nothing ever wrote. A range's expiry is read from valid_to, never stored.
ALTER TABLE billing_orders DROP CONSTRAINT billing_orders_status_check;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_status_check
    CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'REFUNDED', 'CANCELED'));

ALTER TABLE issuers DROP CONSTRAINT issuers_status_check;
ALTER TABLE issuers ADD CONSTRAINT issuers_status_check CHECK (status IN ('ONBOARDING', 'TESTING', 'ENABLED'));

ALTER TABLE issuers DROP CONSTRAINT issuers_operation_mode_check;
ALTER TABLE issuers ADD CONSTRAINT issuers_operation_mode_check CHECK (operation_mode IN ('OWN_SOFTWARE'));

ALTER TABLE accounts DROP CONSTRAINT accounts_status_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_status_check CHECK (status IN ('ACTIVE', 'SUSPENDED'));

ALTER TABLE numbering_ranges DROP CONSTRAINT numbering_ranges_status_check;
ALTER TABLE numbering_ranges ADD CONSTRAINT numbering_ranges_status_check CHECK (status IN ('ACTIVE', 'EXHAUSTED'));
