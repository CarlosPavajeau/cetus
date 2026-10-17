package com.cantte.cetus.persistence.audit;

/** Sensitive changes on an account that are recorded in the audit log. */
public enum AuditAction {
    ACCOUNT_CREATED,
    API_KEY_CREATED,
    API_KEY_REVOKED,
    ISSUER_CREATED,
    SOFTWARE_CREDENTIALS_SET,
    CERTIFICATE_UPLOADED,
    NUMBERING_RANGE_ADDED,
    ISSUER_STATUS_CHANGED
}
