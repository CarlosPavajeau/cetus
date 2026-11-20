package com.cantte.cetus.api.batches;

import com.cantte.cetus.api.invoices.InvoiceRequest;
import com.cantte.cetus.api.invoices.InvoiceRequest.LineTax;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.PersonType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Invoices to issue together. Each item is an invoice whose customer and lines may point at the catalogs: the
 * fields it leaves out come from the catalog entry with the same identification or product code. The items are
 * validated one by one when the batch is received, so {@code items} only checks its size here.
 */
@Schema(description = "Facturas para emitir juntas.")
public record BatchRequest(
        @Schema(description = "Emisor de todas las facturas; fija el ambiente.") @NotNull
        UUID issuerId,

        @Schema(description = "Nombre del archivo del que salen las facturas.")
        @Size(max = 255)
        @Pattern(regexp = "[^\\p{Cntrl}]*")
        String fileName,

        @Schema(description = "SHA-256 del archivo, en hexadecimal.") @Pattern(regexp = "[0-9a-f]{64}")
        String fileSha256,

        @Schema(description = "De 1 a 1000 facturas.") @NotEmpty @Size(max = BatchRequest.ITEMS_MAX)
        List<@NotNull Item> items) {

    public static final int ITEMS_MAX = 1000;

    @Schema(name = "BatchItem", description = "Una factura del lote.")
    public record Item(
            @Schema(description = "Tu referencia de la factura, única en el lote.", example = "ARR-2026-11-001")
            @NotBlank
            @Size(max = 40)
            @Pattern(regexp = "[^\\p{Cntrl}]*")
            String reference,

            @Schema(description = "Moneda ISO 4217. Por defecto, `COP`.") @Pattern(regexp = "[A-Z]{3}")
            String currency,

            @NotNull @Valid Customer customer,

            @NotNull @Valid InvoiceRequest.Payment payment,

            @NotEmpty @Size(max = 500) List<@Valid @NotNull Line> lines,

            @Size(max = 20) List<@Size(max = 500) String> notes) {}

    @Schema(
            name = "BatchCustomer",
            description = "El adquiriente. Si su identificación está en el catálogo de clientes, los campos vacíos "
                    + "se toman de allí.")
    public record Customer(
            PersonType personType,

            @NotNull IdentificationType identificationType,

            @NotBlank @Size(max = 20) String identificationNumber,

            @Pattern(regexp = "\\d") String checkDigit,

            @Size(max = 450) String legalName,

            @Size(max = 450) String tradeName,

            @Size(max = 5) List<@NotNull @Pattern(regexp = InvoiceRequest.TAX_LEVEL_CODE) String> taxLevelCodes,

            InvoiceRequest.CustomerTaxScheme taxScheme,

            @Valid InvoiceRequest.AddressInput address,

            @Size(max = 254) @Email(regexp = InvoiceRequest.EMAIL)
            String email,

            @Size(max = 50) @Pattern(regexp = InvoiceRequest.PHONE)
            String phone) {}

    @Schema(
            name = "BatchLine",
            description = "Una línea. Con un código del catálogo de productos, la descripción, la unidad, el precio "
                    + "y los impuestos vacíos se toman de allí.")
    public record Line(
            @Size(max = 50) @Pattern(regexp = "[^\\p{Cntrl}]*")
            String productCode,

            @Size(max = 300) String description,

            @NotNull @Positive @Digits(integer = 14, fraction = 6)
            BigDecimal quantity,

            @Pattern(regexp = InvoiceRequest.DIAN_CODE) String unitCode,

            @PositiveOrZero @Digits(integer = 14, fraction = 6)
            BigDecimal unitPrice,

            @Size(max = 5) List<@Valid @NotNull LineTax> taxes) {}
}
