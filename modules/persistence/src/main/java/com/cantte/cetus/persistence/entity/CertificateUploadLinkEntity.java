package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

/** A one-time link to upload an issuer's certificate; see V13. */
@Entity
@Table(name = "certificate_upload_links")
public class CertificateUploadLinkEntity extends PanacheEntityBase {

    @Id
    public UUID id;
    @Column(name = "account_id")
    public UUID accountId;
    @Column(name = "issuer_id")
    public UUID issuerId;
    @Column(name = "token_hash")
    public String tokenHash;
    /** Better Auth user id of the Cetus team member who generated it. */
    @Column(name = "created_by")
    public String createdBy;
    @Column(name = "expires_at")
    public OffsetDateTime expiresAt;
    @Column(name = "used_at")
    public OffsetDateTime usedAt;

    /** The link behind a token while it can still be used, locked so two uploads cannot both spend it. */
    public static Optional<CertificateUploadLinkEntity> findUsableForUpdate(String tokenHash) {
        return find("tokenHash = ?1 and usedAt is null and expiresAt > ?2", tokenHash, OffsetDateTime.now())
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    public static Optional<CertificateUploadLinkEntity> findUsable(String tokenHash) {
        return find("tokenHash = ?1 and usedAt is null and expiresAt > ?2", tokenHash, OffsetDateTime.now())
                .firstResultOptional();
    }

    /** A new link replaces the issuer's earlier unused ones: only the last one sent works. */
    public static void expireUnused(UUID issuerId) {
        update("expiresAt = ?1 where issuerId = ?2 and usedAt is null and expiresAt > ?1",
                OffsetDateTime.now(), issuerId);
    }
}
