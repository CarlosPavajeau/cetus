package com.cantte.cetus.api.invoices;

import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.domain.model.TaxType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
        List<@Size(max = 500) String> notes) {

    public record Customer(
            @NotNull PersonType personType,
            @NotNull IdentificationType identificationType,
            @NotBlank @Size(max = 20) String identificationNumber,
            @Pattern(regexp = "\\d") String checkDigit,
            @NotBlank @Size(max = 450) String legalName,
            @Size(max = 450) String tradeName,
            List<String> taxLevelCodes,
            CustomerTaxScheme taxScheme,
            @Valid AddressInput address,
            @Email String email,
            String phone) {
    }

    public enum CustomerTaxScheme { IVA, NOT_APPLICABLE }

    public record AddressInput(
            @NotBlank String municipalityCode,
            @NotBlank String cityName,
            @NotBlank String departmentCode,
            @NotBlank String departmentName,
            String postalCode,
            @NotBlank String line,
            @Pattern(regexp = "[A-Z]{2}") String countryCode,
            String countryName) {
    }

    public record Payment(
            @NotNull PaymentMethod method,
            @NotBlank String meansCode,
            LocalDate dueDate) {
    }

    public enum PaymentMethod { CASH, CREDIT }

    public record Line(
            @Size(max = 50) String itemCode,
            @NotBlank @Size(max = 300) String description,
            @NotNull @Positive BigDecimal quantity,
            String unitCode,
            @NotNull @PositiveOrZero BigDecimal unitPrice,
            List<@Valid LineTax> taxes) {
    }

    public record LineTax(
            @NotNull TaxType type,
            @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal percent) {
    }
}
