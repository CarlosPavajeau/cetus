package com.cantte.cetus.api.invoices;

import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.domain.model.TaxType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Public contract of POST /v1/invoices. Business language, no UBL details. The issuer can be left
 * out when the account has a single one able to issue in the key's environment.
 */
@Schema(description = "Una factura electrónica de venta.")
public record InvoiceRequest(
        @Schema(description = "Emisor que factura. Omítelo si solo uno de tus emisores puede emitir con esta llave.")
        UUID issuerId,

        @Schema(
                description =
                        "Tu referencia, por ejemplo el número de pedido. Vuelve en las respuestas y los webhooks.",
                example = "PED-2041")
        @Size(max = 100)
        String externalReference,

        @Schema(description = "Moneda ISO 4217. Por defecto, `COP`.", example = "COP") @Pattern(regexp = "[A-Z]{3}")
        String currency,

        @Schema(description = "El adquiriente: a quien se le factura.") @NotNull @Valid
        Customer customer,

        @Schema(description = "Forma y medio de pago.") @NotNull @Valid
        Payment payment,

        @Schema(description = "Lo que se factura, de 1 a 500 líneas.") @NotEmpty @Size(max = 500)
        List<@Valid @NotNull Line> lines,

        @Schema(description = "Notas libres que aparecen en el documento.") @Size(max = 20)
        List<@Size(max = 500) String> notes) {

    /** Fiscal responsibilities a customer can declare (annex table 13.2.6.1). */
    public static final String TAX_LEVEL_CODE = "O-13|O-15|O-23|O-47|R-99-PN";
    /** A code of a DIAN list: payment means, unit of measure. */
    public static final String DIAN_CODE = "[0-9A-Z]{1,3}";
    /** Municipality, department or postal code; foreign addresses use their own codes. */
    public static final String CODE = "[0-9A-Za-z-]{1,10}";

    public static final String PHONE = "[0-9+() -]*";
    /** Stricter than @Email alone: no quoted local part, no comments, a dotted domain. */
    public static final String EMAIL = "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}";

    @Schema(description = "Un adquiriente: la persona o empresa a quien se le factura.")
    public record Customer(
            @Schema(description = "Persona natural o jurídica.") @NotNull
            PersonType personType,

            @Schema(description = "Tipo de documento de identificación.") @NotNull
            IdentificationType identificationType,

            @Schema(description = "Número de identificación, sin dígito de verificación.", example = "900123456")
            @NotBlank
            @Size(max = 20)
            String identificationNumber,

            @Schema(
                    description =
                            "Dígito de verificación, solo para un NIT. Si lo envías, Cetus comprueba que corresponda; si "
                                    + "no, lo calcula.",
                    example = "8")
            @Pattern(regexp = "\\d")
            String checkDigit,

            @Schema(description = "Razón social o nombre completo.", example = "Distribuidora Andina SAS")
            @NotBlank
            @Size(max = 450)
            String legalName,

            @Schema(description = "Nombre comercial.") @Size(max = 450)
            String tradeName,

            @Schema(
                    description = "Responsabilidades fiscales del RUT (tabla 13.2.6.1 del anexo): `O-13` gran "
                            + "contribuyente, `O-15` autorretenedor, `O-23` agente de retención de IVA, `O-47` "
                            + "régimen simple, `R-99-PN` no responsable. Por defecto, `R-99-PN`.",
                    example = "[\"O-13\"]")
            @Size(max = 5)
            List<@NotNull @Pattern(regexp = TAX_LEVEL_CODE) String> taxLevelCodes,

            @Schema(description = "Si es responsable de IVA. Por defecto, `NOT_APPLICABLE`.")
            CustomerTaxScheme taxScheme,

            @Schema(description = "Dirección del adquiriente.") @Valid
            AddressInput address,

            @Schema(
                    description = "Correo al que Cetus entrega la factura cuando la DIAN la acepta.",
                    example = "facturas@andina.example")
            @Size(max = 254)
            @Email(regexp = EMAIL)
            String email,

            @Schema(description = "Teléfono.", example = "+57 601 555 0101") @Size(max = 50) @Pattern(regexp = PHONE)
            String phone) {}

    public enum CustomerTaxScheme {
        IVA,
        NOT_APPLICABLE
    }

    @Schema(description = "Una dirección. Los códigos son los de DIVIPOLA para Colombia.")
    public record AddressInput(
            @Schema(description = "Código DIVIPOLA del municipio.", example = "11001") @NotBlank @Pattern(regexp = CODE)
            String municipalityCode,

            @Schema(description = "Nombre del municipio.", example = "Bogotá, D.C.") @NotBlank @Size(max = 100)
            String cityName,

            @Schema(description = "Código DIVIPOLA del departamento.", example = "11") @NotBlank @Pattern(regexp = CODE)
            String departmentCode,

            @Schema(description = "Nombre del departamento.", example = "Bogotá") @NotBlank @Size(max = 100)
            String departmentName,

            @Schema(description = "Código postal.", example = "110111") @Pattern(regexp = CODE)
            String postalCode,

            @Schema(description = "Dirección.", example = "Calle 93 # 11-26") @NotBlank @Size(max = 300)
            String line,

            @Schema(description = "País ISO 3166-1 alfa-2. Por defecto, `CO`.", example = "CO")
            @Pattern(regexp = "[A-Z]{2}")
            String countryCode,

            @Schema(description = "Nombre del país. Por defecto, Colombia.") @Size(max = 100)
            String countryName) {

        /** Colombia unless the country is given. */
        public Address toAddress() {
            return new Address(
                    municipalityCode,
                    cityName,
                    departmentCode,
                    departmentName,
                    postalCode,
                    line,
                    countryCode != null ? countryCode : "CO",
                    countryName != null ? countryName : "Colombia");
        }
    }

    @Schema(description = "Cómo se paga la factura.")
    public record Payment(
            @Schema(description = "Contado o crédito.") @NotNull
            PaymentMethod method,

            @Schema(
                    description = "Medio de pago (tabla 13.3.4.2 del anexo): `10` efectivo, `42` consignación, `47` "
                            + "transferencia, `48` tarjeta crédito, `49` tarjeta débito, `20` cheque, `ZZZ` otro.",
                    example = "10")
            @NotBlank
            @Pattern(regexp = DIAN_CODE)
            String meansCode,

            @Schema(description = "Fecha de vencimiento. Obligatoria para `CREDIT`.", example = "2026-11-30")
            LocalDate dueDate) {}

    public enum PaymentMethod {
        CASH,
        CREDIT
    }

    @Schema(description = "Una línea del documento: un producto o servicio.")
    public record Line(
            @Schema(description = "Tu código del producto o servicio.", example = "PROD-001") @NotBlank @Size(max = 50)
            String itemCode,

            @Schema(description = "Descripción.", example = "Caja de guantes de nitrilo") @NotBlank @Size(max = 300)
            String description,

            @Schema(description = "Cantidad, mayor que cero.", example = "10")
            @NotNull
            @Positive
            @Digits(integer = 14, fraction = 6)
            BigDecimal quantity,

            @Schema(description = "Código de unidad de medida de la DIAN. Por defecto, `94` (unidad).", example = "94")
            @Pattern(regexp = DIAN_CODE)
            String unitCode,

            @Schema(description = "Precio unitario antes de impuestos.", example = "25000")
            @NotNull
            @PositiveOrZero
            @Digits(integer = 14, fraction = 6)
            BigDecimal unitPrice,

            @Schema(description = "Impuestos de la línea. Vacío o sin enviar si está excluida de impuestos.")
            @Size(max = 5)
            List<@Valid @NotNull LineTax> taxes) {}

    @Schema(description = "Un impuesto de una línea.")
    public record LineTax(
            @Schema(description = "Impuesto.") @NotNull TaxType type,

            @Schema(description = "Tarifa en porcentaje: 19 para IVA del 19 %, 0 para exento.", example = "19")
            @NotNull
            @DecimalMin("0")
            @DecimalMax("100")
            @Digits(integer = 3, fraction = 4)
            BigDecimal percent) {}
}
