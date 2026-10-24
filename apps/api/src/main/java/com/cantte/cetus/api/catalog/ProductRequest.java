package com.cantte.cetus.api.catalog;

import com.cantte.cetus.api.invoices.InvoiceRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

/** A product or service of the catalog, with the same rules as a line of an invoice. */
public record ProductRequest(
        @NotBlank @Size(max = 50) String code,
        @NotBlank @Size(max = 300) String description,
        @Pattern(regexp = InvoiceRequest.DIAN_CODE) String unitCode,

        @NotNull @PositiveOrZero @Digits(integer = 14, fraction = 6)
        BigDecimal unitPrice,

        @Size(max = 5) List<InvoiceRequest.@Valid LineTax> taxes) {}
