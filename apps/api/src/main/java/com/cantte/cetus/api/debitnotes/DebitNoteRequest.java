package com.cantte.cetus.api.debitnotes;

import com.cantte.cetus.api.documents.CorrectionRequest;
import com.cantte.cetus.api.invoices.InvoiceRequest;
import com.cantte.cetus.domain.model.DebitNoteConcept;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/**
 * Public contract of POST /v1/debit-notes. The customer, currency and payment come from the invoice;
 * the lines are what the note charges on top of it.
 */
public record DebitNoteRequest(
        @NotNull UUID invoiceId,
        @NotNull DebitNoteConcept concept,
        @NotBlank @Size(max = 500) String description,
        @NotEmpty @Size(max = 500) List<InvoiceRequest.@Valid @NotNull Line> lines,
        @Size(max = 100) String externalReference,
        @Size(max = 20) List<@Size(max = 500) String> notes)
        implements CorrectionRequest {}
