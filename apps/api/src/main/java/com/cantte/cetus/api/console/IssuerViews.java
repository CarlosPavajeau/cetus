package com.cantte.cetus.api.console;

import com.cantte.cetus.api.invoices.InvoiceRequest;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.SigningCertificateEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public final class IssuerViews {

    private IssuerViews() {}

    /**
     * The name of the issuer goes on one line: it is a field of the delivery email's subject, where a line
     * break would end the header.
     */
    static final String ONE_LINE = "[^\\r\\n]*";
    /** Software ID and TestSetId, as the DIAN portal shows them. */
    static final String DIAN_UUID = "[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}";
    /** A .p12 is a few KB; the limit leaves room for long chains and keeps base64 decoding cheap. */
    static final int MAX_PKCS12_BASE64 = 200_000;
    /** Consecutive numbers have up to 15 digits, as the console asks. */
    static final long MAX_NUMBER = 999_999_999_999_999L;

    public record CreateIssuerRequest(
            @NotNull Environment environment,
            @NotBlank @Pattern(regexp = "\\d{5,15}") String nit,
            @Pattern(regexp = "\\d") String checkDigit,

            @NotBlank @Size(max = 450) @Pattern(regexp = ONE_LINE)
            String legalName,

            @Size(max = 450) @Pattern(regexp = ONE_LINE) String tradeName,
            @NotNull PersonType personType,

            @NotEmpty @Size(max = 5)
            List<@NotNull @Pattern(regexp = InvoiceRequest.TAX_LEVEL_CODE) String> taxLevelCodes,

            boolean responsibleForIva,
            @NotNull @Valid InvoiceRequest.AddressInput address,

            @NotBlank @Size(max = 254) @Email(regexp = InvoiceRequest.EMAIL)
            String email,

            @Size(max = 50) @Pattern(regexp = InvoiceRequest.PHONE)
            String phone) {}

    /** The tax data that can change while the issuer is being set up: everything but its NIT and environment. */
    public record UpdateIssuerRequest(
            @NotBlank @Size(max = 450) @Pattern(regexp = ONE_LINE)
            String legalName,

            @Size(max = 450) @Pattern(regexp = ONE_LINE) String tradeName,
            @NotNull PersonType personType,

            @NotEmpty @Size(max = 5)
            List<@NotNull @Pattern(regexp = InvoiceRequest.TAX_LEVEL_CODE) String> taxLevelCodes,

            boolean responsibleForIva,
            @NotNull @Valid InvoiceRequest.AddressInput address,

            @NotBlank @Size(max = 254) @Email(regexp = InvoiceRequest.EMAIL)
            String email,

            @Size(max = 50) @Pattern(regexp = InvoiceRequest.PHONE)
            String phone) {}

    public record SoftwareRequest(
            @NotBlank @Pattern(regexp = DIAN_UUID) String softwareId,
            @NotBlank @Size(max = 100) String pin,
            @Pattern(regexp = DIAN_UUID) String testSetId) {}

    public record CertificateRequest(
            @NotBlank @Size(max = MAX_PKCS12_BASE64) String pkcs12Base64,
            @NotBlank @Size(max = 256) String password) {}

    /**
     * The prefix goes into the document number, its QR and file names; the resolution number and the technical
     * key into the XML and the CUFE. None of them carries spaces or line breaks.
     */
    public record NumberingRangeRequest(
            @NotNull DocumentType documentType,
            @Pattern(regexp = "\\d{1,20}") String resolutionNumber,
            LocalDate resolutionDate,
            @Pattern(regexp = "[A-Za-z0-9]{0,4}") String prefix,
            @Positive @Max(MAX_NUMBER) long from,
            @Positive @Max(MAX_NUMBER) long to,
            LocalDate validFrom,
            LocalDate validTo,
            @Pattern(regexp = "[0-9A-Za-z-]{1,100}") String technicalKey) {}

    public record IssuerView(
            UUID id,
            Environment environment,
            String nit,
            String checkDigit,
            String legalName,
            @Schema(nullable = true) String tradeName,
            IssuerEntity.Status status) {
        public static IssuerView from(IssuerEntity issuer) {
            return new IssuerView(
                    issuer.id,
                    issuer.environment,
                    issuer.nit,
                    issuer.checkDigit,
                    issuer.legalName,
                    issuer.tradeName,
                    issuer.status);
        }
    }

    /**
     * An issuer with everything the console needs to resume its setup. It never includes the PIN,
     * the certificate or its password, nor the technical key.
     */
    public record IssuerDetailView(
            UUID id,
            Environment environment,
            String nit,
            String checkDigit,
            String legalName,
            @Schema(nullable = true) String tradeName,
            IssuerEntity.Status status,
            PersonType personType,
            List<String> taxLevelCodes,
            boolean responsibleForIva,
            Address address,
            String email,
            @Schema(nullable = true) String phone,
            @Schema(nullable = true) SoftwareView software,
            @Schema(nullable = true) CertificateView certificate,
            List<NumberingRangeView> ranges,
            @Schema(nullable = true) TestSetProgressView testSet) {
        public static IssuerDetailView from(IssuerEntity issuer) {
            List<String> taxLevelCodes = issuer.taxLevelCodes == null || issuer.taxLevelCodes.isBlank()
                    ? List.of()
                    : List.of(issuer.taxLevelCodes.split(";"));
            SoftwareCredentialEntity software =
                    SoftwareCredentialEntity.findActive(issuer.id).orElse(null);
            return new IssuerDetailView(
                    issuer.id,
                    issuer.environment,
                    issuer.nit,
                    issuer.checkDigit,
                    issuer.legalName,
                    issuer.tradeName,
                    issuer.status,
                    issuer.personType,
                    taxLevelCodes,
                    "01".equals(issuer.taxSchemeId),
                    issuer.address,
                    issuer.email,
                    issuer.phone,
                    software == null ? null : SoftwareView.from(software),
                    SigningCertificateEntity.findActive(issuer.id)
                            .map(CertificateView::from)
                            .orElse(null),
                    NumberingRangeEntity.listByIssuer(issuer.id).stream()
                            .map(NumberingRangeView::from)
                            .toList(),
                    TestSetProgressView.of(issuer, software));
        }
    }

    /**
     * What Cetus sent to the issuer's current test set, by document type. Only the DIAN portal knows
     * how many documents the set asks for and whether habilitación is done; this is what to compare
     * it against.
     */
    public record TestSetProgressView(
            String testSetId,
            OffsetDateTime since,

            @Schema(nullable = true, description = "When the DIAN reported the set as accepted: habilitación is done")
            OffsetDateTime acceptedAt,

            List<TestSetCountView> documents) {
        /** Null unless the issuer sends to a test set: a test issuer whose software has a TestSetId. */
        static TestSetProgressView of(IssuerEntity issuer, SoftwareCredentialEntity software) {
            if (issuer.environment != Environment.TEST
                    || software == null
                    || software.testSetId == null
                    || software.testSetId.isBlank()) {
                return null;
            }
            OffsetDateTime since = SoftwareCredentialEntity.testSetStart(issuer.id, software.testSetId);
            List<DocumentEntity.StatusCount> counts = DocumentEntity.countTestDocuments(issuer.id, since);
            List<TestSetCountView> documents = Arrays.stream(DocumentType.values())
                    .map(type -> TestSetCountView.of(type, counts))
                    .toList();
            return new TestSetProgressView(
                    software.testSetId,
                    since,
                    SoftwareCredentialEntity.testSetAcceptedAt(issuer.id, software.testSetId),
                    documents);
        }
    }

    /** Documents of one type in the test set: accepted and rejected by the DIAN, in progress, or failed to send. */
    public record TestSetCountView(
            DocumentType documentType, long accepted, long rejected, long inProgress, long failed) {
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
            String softwareId, @Schema(nullable = true) String testSetId) {
        static SoftwareView from(SoftwareCredentialEntity credential) {
            return new SoftwareView(credential.softwareId, credential.testSetId);
        }
    }

    /** Metadata of the active signing certificate. */
    public record CertificateView(
            String subject, String serialNumber, OffsetDateTime validFrom, OffsetDateTime validTo) {
        static CertificateView from(SigningCertificateEntity certificate) {
            return new CertificateView(
                    certificate.subjectDn, certificate.serialNumber, certificate.validFrom, certificate.validTo);
        }
    }

    public record NumberingRangeView(
            UUID id,
            DocumentType documentType,
            String prefix,
            long from,
            long to,
            long nextNumber,
            @Schema(nullable = true) LocalDate validTo,
            String status,

            @Schema(nullable = true, description = "GetNumberingRange outcome; invoice ranges only")
            NumberingRangeEntity.VerificationStatus verificationStatus,

            @Schema(nullable = true) OffsetDateTime verifiedAt,

            @Schema(nullable = true, description = "What differs from the DIAN, or why it could not be checked")
            String verificationError) {
        public static NumberingRangeView from(NumberingRangeEntity range) {
            return new NumberingRangeView(
                    range.id,
                    range.documentType,
                    range.prefix,
                    range.rangeFrom,
                    range.rangeTo,
                    range.nextNumber,
                    range.validTo,
                    range.status,
                    range.verificationStatus,
                    range.verifiedAt,
                    range.verificationError);
        }
    }
}
