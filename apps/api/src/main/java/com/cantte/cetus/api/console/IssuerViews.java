package com.cantte.cetus.api.console;

import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.SigningCertificateEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
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

    /** The tax data that can change while the issuer is being set up: everything but its NIT and environment. */
    public record UpdateIssuerRequest(
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

    /**
     * An issuer with everything the console needs to resume its setup. It never includes the PIN,
     * the certificate or its password, nor the technical key.
     */
    public record IssuerDetailView(
            @Schema(required = true) UUID id,
            @Schema(required = true) Environment environment,
            @Schema(required = true) String nit,
            @Schema(required = true) String checkDigit,
            @Schema(required = true) String legalName,
            @Schema(required = true, nullable = true) String tradeName,
            @Schema(required = true) IssuerEntity.Status status,
            @Schema(required = true) PersonType personType,
            @Schema(required = true) List<String> taxLevelCodes,
            @Schema(required = true) boolean responsibleForIva,
            @Schema(required = true) Address address,
            @Schema(required = true) String email,
            @Schema(required = true, nullable = true) String phone,
            @Schema(required = true, nullable = true) SoftwareView software,
            @Schema(required = true, nullable = true) CertificateView certificate,
            @Schema(required = true) List<NumberingRangeView> ranges,
            @Schema(required = true, nullable = true) TestSetProgressView testSet) {
        static IssuerDetailView from(IssuerEntity issuer) {
            List<String> taxLevelCodes = issuer.taxLevelCodes == null || issuer.taxLevelCodes.isBlank()
                    ? List.of() : List.of(issuer.taxLevelCodes.split(";"));
            SoftwareCredentialEntity software = SoftwareCredentialEntity.findActive(issuer.id).orElse(null);
            return new IssuerDetailView(issuer.id, issuer.environment, issuer.nit, issuer.checkDigit,
                    issuer.legalName, issuer.tradeName, issuer.status, issuer.personType, taxLevelCodes,
                    "01".equals(issuer.taxSchemeId), issuer.address, issuer.email, issuer.phone,
                    software == null ? null : SoftwareView.from(software),
                    SigningCertificateEntity.findActive(issuer.id).map(CertificateView::from).orElse(null),
                    NumberingRangeEntity.listByIssuer(issuer.id).stream().map(NumberingRangeView::from).toList(),
                    TestSetProgressView.of(issuer, software));
        }
    }

    /**
     * What Cetus sent to the issuer's current test set, by document type. Only the DIAN portal knows
     * how many documents the set asks for and whether habilitación is done; this is what to compare
     * it against.
     */
    public record TestSetProgressView(
            @Schema(required = true) String testSetId,
            @Schema(required = true) OffsetDateTime since,
            @Schema(required = true, nullable = true,
                    description = "When the DIAN reported the set as accepted: habilitación is done")
            OffsetDateTime acceptedAt,
            @Schema(required = true) List<TestSetCountView> documents) {
        /** Null unless the issuer sends to a test set: a test issuer whose software has a TestSetId. */
        static TestSetProgressView of(IssuerEntity issuer, SoftwareCredentialEntity software) {
            if (issuer.environment != Environment.TEST || software == null
                    || software.testSetId == null || software.testSetId.isBlank()) {
                return null;
            }
            OffsetDateTime since = SoftwareCredentialEntity.testSetStart(issuer.id, software.testSetId);
            List<DocumentEntity.StatusCount> counts = DocumentEntity.countTestDocuments(issuer.id, since);
            List<TestSetCountView> documents = Arrays.stream(DocumentType.values())
                    .map(type -> TestSetCountView.of(type, counts))
                    .toList();
            return new TestSetProgressView(software.testSetId, since,
                    SoftwareCredentialEntity.testSetAcceptedAt(issuer.id, software.testSetId), documents);
        }
    }

    /** Documents of one type in the test set: accepted and rejected by the DIAN, in progress, or failed to send. */
    public record TestSetCountView(
            @Schema(required = true) DocumentType documentType,
            @Schema(required = true) long accepted,
            @Schema(required = true) long rejected,
            @Schema(required = true) long inProgress,
            @Schema(required = true) long failed) {
        static TestSetCountView of(DocumentType type, List<DocumentEntity.StatusCount> counts) {
            long accepted = 0, rejected = 0, inProgress = 0, failed = 0;
            for (DocumentEntity.StatusCount count : counts) {
                if (count.documentType() != type) {
                    continue;
                }
                switch (count.status()) {
                    case ACCEPTED -> accepted += count.count();
                    case REJECTED -> rejected += count.count();
                    case FAILED -> failed += count.count();
                    case RECEIVED, PROCESSING, SUBMITTED -> inProgress += count.count();
                }
            }
            return new TestSetCountView(type, accepted, rejected, inProgress, failed);
        }
    }

    /** The active DIAN software credentials, without the PIN. */
    public record SoftwareView(
            @Schema(required = true) String softwareId,
            @Schema(required = true, nullable = true) String testSetId) {
        static SoftwareView from(SoftwareCredentialEntity credential) {
            return new SoftwareView(credential.softwareId, credential.testSetId);
        }
    }

    /** Metadata of the active signing certificate. */
    public record CertificateView(
            @Schema(required = true) String subject,
            @Schema(required = true) String serialNumber,
            @Schema(required = true) OffsetDateTime validFrom,
            @Schema(required = true) OffsetDateTime validTo) {
        static CertificateView from(SigningCertificateEntity certificate) {
            return new CertificateView(certificate.subjectDn, certificate.serialNumber, certificate.validFrom,
                    certificate.validTo);
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
            @Schema(required = true) String status,
            @Schema(required = true, nullable = true, description = "GetNumberingRange outcome; invoice ranges only")
            NumberingRangeEntity.VerificationStatus verificationStatus,
            @Schema(required = true, nullable = true) OffsetDateTime verifiedAt,
            @Schema(required = true, nullable = true, description = "What differs from the DIAN, or why it could not be checked")
            String verificationError) {
        static NumberingRangeView from(NumberingRangeEntity range) {
            return new NumberingRangeView(range.id, range.documentType, range.prefix, range.rangeFrom,
                    range.rangeTo, range.nextNumber, range.validTo, range.status, range.verificationStatus,
                    range.verifiedAt, range.verificationError);
        }
    }
}
