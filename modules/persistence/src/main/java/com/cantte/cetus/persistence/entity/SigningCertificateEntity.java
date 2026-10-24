package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

/** Metadata of the issuer certificate. The .p12 itself lives sealed in S3. */
@Entity
@Table(name = "signing_certificates")
public class SigningCertificateEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    @Column(name = "issuer_id")
    public UUID issuerId;

    @Column(name = "s3_key")
    public String s3Key;

    @Column(name = "password_sealed")
    public byte[] passwordSealed;

    @Column(name = "subject_dn")
    public String subjectDn;

    @Column(name = "issuer_dn")
    public String issuerDn;

    @Column(name = "serial_number")
    public String serialNumber;

    @Column(name = "fingerprint_sha256")
    public String fingerprintSha256;

    @Column(name = "valid_from")
    public OffsetDateTime validFrom;

    @Column(name = "valid_to")
    public OffsetDateTime validTo;

    public boolean active = true;

    public static Optional<SigningCertificateEntity> findActive(UUID issuerId) {
        return find("issuerId = ?1 and active = true", issuerId).firstResultOptional();
    }

    public static void deactivateAll(UUID issuerId) {
        update("active = false where issuerId = ?1 and active = true", issuerId);
    }
}
