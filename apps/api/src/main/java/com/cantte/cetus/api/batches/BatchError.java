package com.cantte.cetus.api.batches;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Un error de una factura del lote.")
public record BatchError(
        @Schema(description = "Posición de la factura en el lote, desde 0.")
        int index,

        @Schema(description = "Referencia de la factura.", nullable = true)
        String reference,

        @Schema(
                description = "Campo de la factura, como `lines[0].quantity`; vacío si es de toda la factura.",
                nullable = true)
        String field,

        @Schema(description = "Código estable del error.", example = "customer_check_digit_invalid")
        String code,

        @Schema(description = "Explicación para personas.") String message) {}
