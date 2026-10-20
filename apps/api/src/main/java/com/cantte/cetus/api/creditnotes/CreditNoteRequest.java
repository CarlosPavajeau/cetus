package com.cantte.cetus.api.creditnotes;

import com.cantte.cetus.api.invoices.InvoiceRequest;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Public contract of POST /v1/credit-notes. The customer, currency and payment come from the
 * invoice. A CANCELLATION without lines credits the whole invoice.
 */
public record CreditNoteRequest(
        @NotNull UUID invoiceId,
        @NotNull CreditNoteConcept concept,
        @NotBlank @Size(max = 500) String description,
        @Size(max = 500) List<InvoiceRequest.@Valid Line> lines,
        @Size(max = 100) String externalReference,
        @Size(max = 20) List<@Size(max = 500) String> notes) {
}
