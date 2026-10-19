package com.cantte.cetus.persistence.audit;

/** Sensitive changes on an account that are recorded in the audit log. */
public enum AuditAction {
    ACCOUNT_CREATED,
    API_KEY_CREATED,
    API_KEY_REVOKED,
    ISSUER_CREATED,
    ISSUER_UPDATED,
    SOFTWARE_CREDENTIALS_SET,
    CERTIFICATE_UPLOADED,
    NUMBERING_RANGE_ADDED,
    ISSUER_STATUS_CHANGED,
    ISSUER_PROMOTED,
    WEBHOOK_ENDPOINT_CREATED,
    WEBHOOK_ENDPOINT_DISABLED,
    WEBHOOK_ENDPOINT_ENABLED,
    WEBHOOK_DELIVERY_RETRIED,
    /** A credit note issued from the console; those issued through the API are not audited. */
    CREDIT_NOTE_ISSUED
}
