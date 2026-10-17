package com.cantte.cetus.api.console;

import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class IssuerViews {

    private IssuerViews() {
    }

    public record CreateIssuerRequest(
            @NotNull Environment environment,
            @NotBlank @Pattern(regexp = "\\d{5,15}") String nit,
            @Pattern(regexp = "\\d") String checkDigit,
            @NotBlank String legalName,
            String tradeName,
            @NotNull PersonType personType,
            @NotEmpty List<String> taxLevelCodes,
            boolean responsibleForIva,
            @NotNull Address address,
            @NotBlank @Email String email,
            String phone) {
    }

    public record SoftwareRequest(@NotBlank String softwareId, @NotBlank String pin, String testSetId) {
    }

    public record CertificateRequest(@NotBlank String pkcs12Base64, @NotBlank String password) {
    }

    public record NumberingRangeRequest(
            @NotNull DocumentType documentType,
            String resolutionNumber,
            LocalDate resolutionDate,
            String prefix,
            @Positive long from,
            @Positive long to,
            LocalDate validFrom,
            LocalDate validTo,
            String technicalKey) {
    }

    public record IssuerView(
            @Schema(required = true) UUID id,
            @Schema(required = true) Environment environment,
            @Schema(required = true) String nit,
            @Schema(required = true) String checkDigit,
            @Schema(required = true) String legalName,
            @Schema(required = true, nullable = true) String tradeName,
            @Schema(required = true) IssuerEntity.Status status) {
        static IssuerView from(IssuerEntity issuer) {
            return new IssuerView(issuer.id, issuer.environment, issuer.nit, issuer.checkDigit, issuer.legalName,
                    issuer.tradeName, issuer.status);
        }
    }

    public record NumberingRangeView(
            @Schema(required = true) UUID id,
            @Schema(required = true) DocumentType documentType,
            @Schema(required = true) String prefix,
            @Schema(required = true) long from,
            @Schema(required = true) long to,
            @Schema(required = true) long nextNumber,
            @Schema(required = true, nullable = true) LocalDate validTo,
            @Schema(required = true) String status) {
        static NumberingRangeView from(NumberingRangeEntity range) {
            return new NumberingRangeView(range.id, range.documentType, range.prefix, range.rangeFrom,
                    range.rangeTo, range.nextNumber, range.validTo, range.status);
        }
    }
}
