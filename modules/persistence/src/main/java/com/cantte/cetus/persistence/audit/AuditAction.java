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
    /** A range's technical key discarded to take the DIAN's (GetNumberingRange) instead. */
    TECHNICAL_KEY_REQUESTED_FROM_DIAN,
    ISSUER_STATUS_CHANGED,
    ISSUER_PROMOTED,
    WEBHOOK_ENDPOINT_CREATED,
    WEBHOOK_ENDPOINT_DISABLED,
    WEBHOOK_ENDPOINT_ENABLED,
    WEBHOOK_DELIVERY_RETRIED,
    /** Documents issued from the console; those issued through the API are not audited. */
    INVOICE_ISSUED,
    CREDIT_NOTE_ISSUED,
    DEBIT_NOTE_ISSUED,
    /** An accepted document emailed again from the console. */
    DOCUMENT_RESENT,
    ACCOUNT_SUSPENDED,
    ACCOUNT_REACTIVATED,
    /** The Cetus team assigned the account another plan. */
    ACCOUNT_PLAN_CHANGED,
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
    CONTACT_VERIFIED,
    /** A help request from the console, emailed to the Cetus support mailbox. */
    SUPPORT_TICKET_CREATED,
    SUPPORT_TICKET_STATUS_CHANGED
}
