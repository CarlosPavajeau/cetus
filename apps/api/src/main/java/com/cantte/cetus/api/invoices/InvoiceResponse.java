package com.cantte.cetus.api.invoices;

import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record InvoiceResponse(
        UUID id,
        Environment environment,
        String number,
        DocumentStatus status,
        String cufe,
        LocalDate issueDate,
        String currency,
        Totals totals,
        Dian dian,
        String externalReference,
        OffsetDateTime createdAt) {

    public record Totals(BigDecimal lineExtension, BigDecimal taxExclusive, BigDecimal taxInclusive,
                         BigDecimal payable) {
    }

    public record Dian(String statusCode, String statusMessage, List<String> errors, OffsetDateTime validatedAt) {
    }

    public static InvoiceResponse from(DocumentEntity doc) {
        return new InvoiceResponse(
                doc.id,
                doc.environment,
                doc.fullNumber(),
                doc.status,
                doc.cufe,
                doc.issueDate,
                doc.currency,
                new Totals(doc.lineExtensionAmount, doc.taxExclusiveAmount, doc.taxInclusiveAmount, doc.payableAmount),
                new Dian(doc.dianStatusCode, doc.dianStatusMessage, List.copyOf(doc.dianErrors), doc.validatedAt),
                doc.externalReference,
                doc.createdAt != null ? doc.createdAt : OffsetDateTime.now());
    }
}
