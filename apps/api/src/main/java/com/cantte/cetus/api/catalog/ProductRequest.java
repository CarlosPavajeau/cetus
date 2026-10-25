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
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** A product or service of the catalog, with the same rules as a line of an invoice. */
public record ProductRequest(
        @Schema(description = "Tu código del producto; único en el ambiente.", example = "PROD-001")
        @NotBlank
        @Size(max = 50)
        String code,

        @Schema(description = "Descripción.", example = "Caja de guantes de nitrilo") @NotBlank @Size(max = 300)
        String description,

        @Schema(description = "Código de unidad de medida de la DIAN. Por defecto, `94` (unidad).", example = "94")
        @Pattern(regexp = InvoiceRequest.DIAN_CODE)
        String unitCode,

        @Schema(description = "Precio unitario antes de impuestos.", example = "25000")
        @NotNull
        @PositiveOrZero
        @Digits(integer = 14, fraction = 6)
        BigDecimal unitPrice,

        @Schema(description = "Impuestos por defecto. Vacío o sin enviar si está excluido de impuestos.") @Size(max = 5)
        List<InvoiceRequest.@Valid @NotNull LineTax> taxes) {}
