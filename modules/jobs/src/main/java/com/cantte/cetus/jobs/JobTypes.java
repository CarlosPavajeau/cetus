package com.cantte.cetus.jobs;

public final class JobTypes {

    /** Build, sign and send a document to the DIAN. reference_id = document id. */
    public static final String PROCESS_DOCUMENT = "PROCESS_DOCUMENT";
    /** Poll GetStatusZip for an asynchronous test set upload. reference_id = document id. */
    public static final String CHECK_TEST_SET_STATUS = "CHECK_TEST_SET_STATUS";
    /** Build the AttachedDocument and the PDF, and email them to the customer. reference_id = document id. */
    public static final String DELIVER_DOCUMENT = "DELIVER_DOCUMENT";
    /** Email an accepted document again, as asked from the console. reference_id = document delivery id. */
    public static final String RESEND_DOCUMENT = "RESEND_DOCUMENT";
    /** POST a webhook event to one endpoint. reference_id = webhook delivery id. */
    public static final String DELIVER_WEBHOOK = "DELIVER_WEBHOOK";
    /** Compare an invoice range with GetNumberingRange. reference_id = numbering range id. */
    public static final String VERIFY_NUMBERING_RANGE = "VERIFY_NUMBERING_RANGE";
    /** Email a notice to the account's contacts. reference_id = notification_log id. */
    public static final String SEND_NOTIFICATION = "SEND_NOTIFICATION";

    private JobTypes() {}
}
