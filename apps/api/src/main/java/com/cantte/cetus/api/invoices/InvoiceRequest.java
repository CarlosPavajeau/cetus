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

/**
 * Public contract of POST /v1/invoices. Business language, no UBL details. The issuer can be left
 * out when the account has a single one able to issue in the key's environment.
 */
public record InvoiceRequest(
        UUID issuerId,
        @Size(max = 100) String externalReference,
        @Pattern(regexp = "[A-Z]{3}") String currency,
        @NotNull @Valid Customer customer,
        @NotNull @Valid Payment payment,
        @NotEmpty @Size(max = 500) List<@Valid Line> lines,
        @Size(max = 20) List<@Size(max = 500) String> notes) {

    /** Fiscal responsibilities a customer can declare (annex table 13.2.6.1). */
    public static final String TAX_LEVEL_CODE = "O-13|O-15|O-23|O-47|R-99-PN";
    /** A code of a DIAN list: payment means, unit of measure. */
    public static final String DIAN_CODE = "[0-9A-Z]{1,3}";
    /** Municipality, department or postal code; foreign addresses use their own codes. */
    public static final String CODE = "[0-9A-Za-z-]{1,10}";
    public static final String PHONE = "[0-9+() -]*";
    /** Stricter than @Email alone: no quoted local part, no comments, a dotted domain. */
    public static final String EMAIL = "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}";

    public record Customer(
            @NotNull PersonType personType,
            @NotNull IdentificationType identificationType,
            @NotBlank @Size(max = 20) String identificationNumber,
            @Pattern(regexp = "\\d") String checkDigit,
            @NotBlank @Size(max = 450) String legalName,
            @Size(max = 450) String tradeName,
            @Size(max = 5) List<@NotNull @Pattern(regexp = TAX_LEVEL_CODE) String> taxLevelCodes,
            CustomerTaxScheme taxScheme,
            @Valid AddressInput address,
            @Size(max = 254) @Email(regexp = EMAIL) String email,
            @Size(max = 50) @Pattern(regexp = PHONE) String phone) {
    }

    public enum CustomerTaxScheme { IVA, NOT_APPLICABLE }

    public record AddressInput(
            @NotBlank @Pattern(regexp = CODE) String municipalityCode,
            @NotBlank @Size(max = 100) String cityName,
            @NotBlank @Pattern(regexp = CODE) String departmentCode,
            @NotBlank @Size(max = 100) String departmentName,
            @Pattern(regexp = CODE) String postalCode,
            @NotBlank @Size(max = 300) String line,
            @Pattern(regexp = "[A-Z]{2}") String countryCode,
            @Size(max = 100) String countryName) {

        /** Colombia unless the country is given. */
        public Address toAddress() {
            return new Address(municipalityCode, cityName, departmentCode, departmentName, postalCode, line,
                    countryCode != null ? countryCode : "CO", countryName != null ? countryName : "Colombia");
        }
    }

    public record Payment(
            @NotNull PaymentMethod method,
            @NotBlank @Pattern(regexp = DIAN_CODE) String meansCode,
            LocalDate dueDate) {
    }

    public enum PaymentMethod { CASH, CREDIT }

    public record Line(
            @NotBlank @Size(max = 50) String itemCode,
            @NotBlank @Size(max = 300) String description,
            @NotNull @Positive @Digits(integer = 14, fraction = 6) BigDecimal quantity,
            @Pattern(regexp = DIAN_CODE) String unitCode,
            @NotNull @PositiveOrZero @Digits(integer = 14, fraction = 6) BigDecimal unitPrice,
            @Size(max = 5) List<@Valid LineTax> taxes) {
    }

    public record LineTax(
            @NotNull TaxType type,
            @NotNull @DecimalMin("0") @DecimalMax("100") @Digits(integer = 3, fraction = 4) BigDecimal percent) {
    }
}
