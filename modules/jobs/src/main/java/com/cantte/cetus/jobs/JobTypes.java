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
    /** Email a support ticket to the Cetus support mailbox and its receipt to the person. reference_id = ticket id. */
    public static final String SEND_SUPPORT_TICKET = "SEND_SUPPORT_TICKET";
    /** Email an opinion shared from the console to the Cetus support mailbox. reference_id = feedback id. */
    public static final String SEND_FEEDBACK = "SEND_FEEDBACK";

    /** Act on an event received from a provider (Wompi, Resend). reference_id = inbound webhook event id. */
    public static final String PROCESS_WEBHOOK_EVENT = "PROCESS_WEBHOOK_EVENT";
    /** Ask Wompi for the payments of an order whose event may never come. reference_id = billing order id. */
    public static final String CHECK_PAYMENT = "CHECK_PAYMENT";

    private JobTypes() {}
}
