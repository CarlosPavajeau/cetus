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
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Entity
@Table(name = "numbering_ranges")
public class NumberingRangeEntity extends PanacheEntityBase {

    private static final String USABLE = "status = 'ACTIVE' and (validFrom is null or validFrom <= :today) "
            + "and (validTo is null or validTo >= :today)";

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

    /** When the DIAN last answered with VERIFIED or MISMATCH. */
    @Column(name = "verified_at")
    public OffsetDateTime verifiedAt;

    /** When the verification being waited for was asked; the worker answers only that request. */
    @Column(name = "verification_requested_at")
    public OffsetDateTime verificationRequestedAt;

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
                        "issuerId = :issuer and documentType = :type and " + USABLE + " order by validFrom",
                        Map.of("issuer", issuerId, "type", type, "today", date))
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    public static List<NumberingRangeEntity> listByIssuer(UUID issuerId) {
        return list("issuerId", issuerId);
    }

    /** The issuer's ranges of the type that number on {@code today}. */
    public static List<NumberingRangeEntity> listUsable(UUID issuerId, DocumentType type, LocalDate today) {
        return list(
                "issuerId = :issuer and documentType = :type and " + USABLE,
                Map.of("issuer", issuerId, "type", type, "today", today));
    }

    /**
     * SQL for the range {@code alias} numbering on the date {@code today} (a parameter or an SQL expression): active
     * and within its resolution's dates. A range's expiry is never stored, so every query reads it from the dates.
     */
    public static String sqlUsable(String alias, String today) {
        return ("%1$s.status = 'ACTIVE' AND (%1$s.valid_from IS NULL OR %1$s.valid_from <= %2$s)"
                        + " AND (%1$s.valid_to IS NULL OR %1$s.valid_to >= %2$s)")
                .formatted(alias, today);
    }

    /**
     * SQL for the active range {@code alias} its issuer still stands on for its type on {@code today}: in force, or
     * expired with no range of the type in force to take over, which is what the issuer has to renew.
     */
    public static String sqlUnreplaced(String alias, String today) {
        return """
                %1$s.status = 'ACTIVE' AND (%1$s.valid_to IS NULL OR %1$s.valid_to >= %2$s OR NOT EXISTS (
                    SELECT 1 FROM billing.numbering_ranges u
                    WHERE u.issuer_id = %1$s.issuer_id AND u.document_type = %1$s.document_type AND %3$s))""".formatted(alias, today, sqlUsable("u", today));
    }

    /** Past its resolution's last day, whether or not it still has numbers. */
    public boolean expired(LocalDate today) {
        return validTo != null && validTo.isBefore(today);
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
