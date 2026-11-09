package com.cantte.cetus.api.console;

import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity.VerificationStatus;
import com.cantte.cetus.persistence.entity.SigningCertificateEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * What the issuer lacks to issue invoices today, in the order of its setup. The issuer's status only moves forward;
 * a piece that expires later shows here, not in the status.
 */
public record IssuerReadiness(
        @Schema(description = "Nothing is missing") boolean ready,

        @Schema(description = "What is missing, in the order of the setup")
        List<Gap> missing) {

    @Schema(name = "IssuerGap")
    public enum Gap {
        SOFTWARE_MISSING,
        CERTIFICATE_MISSING,
        CERTIFICATE_EXPIRED,
        /** No invoice range in force today: none added, all used up, or past their resolution. */
        INVOICE_RANGE_MISSING,
        /** In production, the invoice range issuance takes is not one the DIAN confirmed (GetNumberingRange). */
        INVOICE_RANGE_UNVERIFIED
    }

    public static IssuerReadiness of(IssuerEntity issuer) {
        // Sandbox issuers sign and number with what Cetus gives them.
        if (issuer.environment == Environment.SANDBOX) {
            return new IssuerReadiness(true, List.of());
        }
        List<Gap> missing = new ArrayList<>();
        if (SoftwareCredentialEntity.findActive(issuer.id).isEmpty()) {
            missing.add(Gap.SOFTWARE_MISSING);
        }
        Optional<SigningCertificateEntity> certificate = SigningCertificateEntity.findActive(issuer.id);
        if (certificate.isEmpty()) {
            missing.add(Gap.CERTIFICATE_MISSING);
        } else if (!certificate.get().validTo.isAfter(OffsetDateTime.now())) {
            missing.add(Gap.CERTIFICATE_EXPIRED);
        }
        List<NumberingRangeEntity> ranges =
                NumberingRangeEntity.listUsable(issuer.id, DocumentType.INVOICE, LocalDate.now(DianTime.ZONE));
        if (ranges.isEmpty()) {
            missing.add(Gap.INVOICE_RANGE_MISSING);
        } else if (issuer.environment == Environment.LIVE
                && ranges.getFirst().verificationStatus != VerificationStatus.VERIFIED) {
            missing.add(Gap.INVOICE_RANGE_UNVERIFIED);
        }
        return new IssuerReadiness(missing.isEmpty(), List.copyOf(missing));
    }
}
