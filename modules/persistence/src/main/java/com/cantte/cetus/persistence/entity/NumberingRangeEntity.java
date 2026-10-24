package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.NumberingAuthorization;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Entity
@Table(name = "numbering_ranges")
public class NumberingRangeEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    @Column(name = "issuer_id")
    public UUID issuerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type")
    public DocumentType documentType;

    @Column(name = "resolution_number")
    public String resolutionNumber;

    @Column(name = "resolution_date")
    public LocalDate resolutionDate;

    public String prefix = "";

    @Column(name = "range_from")
    public long rangeFrom;

    @Column(name = "range_to")
    public long rangeTo;

    @Column(name = "next_number")
    public long nextNumber;

    @Column(name = "valid_from")
    public LocalDate validFrom;

    @Column(name = "valid_to")
    public LocalDate validTo;

    @Column(name = "technical_key_sealed")
    public byte[] technicalKeySealed;

    public String status = "ACTIVE";
    /** GetNumberingRange outcome for invoice ranges; null until it is requested. */
    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status")
    public VerificationStatus verificationStatus;

    @Column(name = "verified_at")
    public OffsetDateTime verifiedAt;

    @Column(name = "verification_error")
    public String verificationError;

    public enum VerificationStatus {
        /** Queued: the worker will ask the DIAN. */
        PENDING,
        /** The DIAN has this prefix, numbers, dates and technical key. */
        VERIFIED,
        /** The DIAN answered with something else; documents would be rejected or carry an invalid CUFE. */
        MISMATCH,
        /** The DIAN could not be asked (missing software or certificate, or it kept failing). */
        ERROR
    }

    /**
     * Locks the active range (SELECT ... FOR UPDATE). Must run inside the transaction that
     * creates the document, so numbers are never duplicated nor skipped on rollback.
     */
    public static Optional<NumberingRangeEntity> lockActive(UUID issuerId, DocumentType type, LocalDate date) {
        return find(
                        "issuerId = ?1 and documentType = ?2 and status = 'ACTIVE' "
                                + "and (validFrom is null or validFrom <= ?3) and (validTo is null or validTo >= ?3) "
                                + "order by validFrom",
                        issuerId,
                        type,
                        date)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    public static List<NumberingRangeEntity> listByIssuer(UUID issuerId) {
        return list("issuerId", issuerId);
    }

    /** Returns the number to use and advances the counter. */
    public long take() {
        long number = nextNumber;
        nextNumber++;
        if (nextNumber > rangeTo) {
            status = "EXHAUSTED";
        }
        return number;
    }

    public NumberingAuthorization toAuthorization() {
        return new NumberingAuthorization(resolutionNumber, validFrom, validTo, prefix, rangeFrom, rangeTo);
    }
}
