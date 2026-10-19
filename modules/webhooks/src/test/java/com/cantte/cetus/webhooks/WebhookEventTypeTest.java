package com.cantte.cetus.webhooks;

import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.webhooks.WebhookEventType.Outcome;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WebhookEventTypeTest {

    @Test
    void mapsEachDocumentTypeAndOutcome() {
        assertThat(WebhookEventType.forDocument(DocumentType.INVOICE, Outcome.ACCEPTED).wireName())
                .isEqualTo("invoice.accepted");
        assertThat(WebhookEventType.forDocument(DocumentType.CREDIT_NOTE, Outcome.REJECTED).wireName())
                .isEqualTo("credit_note.rejected");
        assertThat(WebhookEventType.forDocument(DocumentType.DEBIT_NOTE, Outcome.FAILED).wireName())
                .isEqualTo("debit_note.failed");
    }

    @Test
    void findsATypeByItsWireName() {
        assertThat(WebhookEventType.fromWireName("document.delivery_failed"))
                .contains(WebhookEventType.DOCUMENT_DELIVERY_FAILED);
        assertThat(WebhookEventType.fromWireName("invoice.paid")).isEmpty();
    }
}
