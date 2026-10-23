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
    CREDIT_NOTE_ISSUED,
    ACCOUNT_SUSPENDED,
    ACCOUNT_REACTIVATED,
    /** A person banned from the console by the Cetus team; recorded without an account. */
    USER_BANNED,
    USER_UNBANNED,
    /** A Cetus admin started acting as a console user of the account. */
    IMPERSONATION_STARTED,
    IMPERSONATION_ENDED,
    /** A one-time link for the customer to upload an issuer's certificate. */
    CERTIFICATE_UPLOAD_LINK_CREATED,
    /** A new address for a contact category, waiting for its verification link to be followed. */
    CONTACT_CHANGE_REQUESTED,
    CONTACT_CHANGE_CANCELED,
    /** The new address followed its link and now receives the category's notices. */
    CONTACT_VERIFIED
}
