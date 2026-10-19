package com.cantte.cetus.webhooks;

import com.cantte.cetus.domain.model.DocumentType;

import java.util.Arrays;
import java.util.Optional;

/** The events integrators can receive, with the name they have on the wire. */
public enum WebhookEventType {
    INVOICE_ACCEPTED("invoice.accepted"),
    INVOICE_REJECTED("invoice.rejected"),
    INVOICE_FAILED("invoice.failed"),
    CREDIT_NOTE_ACCEPTED("credit_note.accepted"),
    CREDIT_NOTE_REJECTED("credit_note.rejected"),
    CREDIT_NOTE_FAILED("credit_note.failed"),
    DEBIT_NOTE_ACCEPTED("debit_note.accepted"),
    DEBIT_NOTE_REJECTED("debit_note.rejected"),
    DEBIT_NOTE_FAILED("debit_note.failed"),
    /** The customer's mail server took the email with the AttachedDocument and the PDF. */
    DOCUMENT_DELIVERED("document.delivered"),
    /** The email could not be delivered (bounced, complaint, skipped or failed): deliver it by other means. */
    DOCUMENT_DELIVERY_FAILED("document.delivery_failed");

    /** How the DIAN validation of a document ended. */
    public enum Outcome { ACCEPTED, REJECTED, FAILED }

    private final String wireName;

    WebhookEventType(String wireName) {
        this.wireName = wireName;
    }

    public String wireName() {
        return wireName;
    }

    public static WebhookEventType forDocument(DocumentType documentType, Outcome outcome) {
        String prefix = switch (documentType) {
            case INVOICE -> "INVOICE";
            case CREDIT_NOTE -> "CREDIT_NOTE";
            case DEBIT_NOTE -> "DEBIT_NOTE";
        };
        return valueOf(prefix + "_" + outcome.name());
    }

    public static Optional<WebhookEventType> fromWireName(String wireName) {
        return Arrays.stream(values()).filter(type -> type.wireName.equals(wireName)).findFirst();
    }
}
