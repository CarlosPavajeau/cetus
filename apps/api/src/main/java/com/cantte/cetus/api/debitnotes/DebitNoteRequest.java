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
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Public contract of POST /v1/debit-notes. The customer, currency and payment come from the invoice;
 * the lines are what the note charges on top of it.
 */
public record DebitNoteRequest(
        @Schema(description = "La factura que se corrige. Debe estar aceptada por la DIAN.") @NotNull
        UUID invoiceId,

        @Schema(description = "Concepto de la nota (tabla 13.2.4 del anexo).") @NotNull
        DebitNoteConcept concept,

        @Schema(description = "Motivo de la nota; aparece en el documento.", example = "Factura emitida por error")
        @NotBlank
        @Size(max = 500)
        String description,

        @Schema(description = "Lo que la nota cobra, de 1 a 500 líneas.") @NotEmpty @Size(max = 500)
        List<InvoiceRequest.@Valid @NotNull Line> lines,

        @Schema(description = "Tu referencia. Vuelve en las respuestas y los webhooks.") @Size(max = 100)
        String externalReference,

        @Schema(description = "Notas libres que aparecen en el documento.") @Size(max = 20)
        List<@Size(max = 500) String> notes)
        implements CorrectionRequest {}
