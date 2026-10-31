package com.cantte.cetus.credits;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.CreditMovementEntity;
import com.cantte.cetus.persistence.entity.CreditReservationEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Grants, reserves, confirms, releases and expires credits, always in the caller's transaction and under a lock
 * per account until it ends, so two documents never take the same credit nor the last grace slot. Whoever also
 * locks a document takes that lock first. Every change is a movement; a lot's remaining is the sum of its own.
 */
@ApplicationScoped
public class CreditLedger {

    private static final Logger LOG = Logger.getLogger(CreditLedger.class);

    /** Where a lot comes from: granted once per source. */
    public record Source(CreditGrantEntity.SourceType type, UUID id) {}

    @Inject
    EntityManager em;

    @Inject
    Entitlements entitlements;

    /**
     * false while observing: nothing is refused, only logged, so the numbers can be checked before anyone gets a
     * 402. A document that would have been refused is reserved as grace already settled: no lot ever pays for it.
     */
    @ConfigProperty(name = "cetus.credits.enforce", defaultValue = "true")
    boolean enforce;

    /**
     * Grants a lot, after settling with it the grace documents already accepted. Granting a source again does
     * nothing.
     *
     * @return the new lot, or empty when the source already had one
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public Optional<CreditGrantEntity> grant(
            UUID accountId,
            Source source,
            UUID planVersionId,
            int quantity,
            OffsetDateTime expiresAt,
            Actor actor,
            String reason) {
        lock(accountId);
        if (CreditGrantEntity.findBySource(source.type(), source.id()).isPresent()) {
            return Optional.empty();
        }
        CreditGrantEntity lot = new CreditGrantEntity();
        lot.id = Ids.newId();
        lot.accountId = accountId;
        lot.planVersionId = planVersionId;
        lot.sourceType = source.type();
        lot.sourceId = source.id();
        lot.quantity = quantity;
        lot.remaining = quantity;
        lot.expiresAt = expiresAt;
        lot.status = CreditGrantEntity.Status.ACTIVE;
        lot.persist();
        move(accountId, lot.id, null, null, CreditMovementEntity.Type.GRANT, quantity, actor, reason);
        for (CreditReservationEntity grace : CreditReservationEntity.listGraceOpen(accountId)) {
            if (lot.remaining == 0) {
                break;
            }
            if (grace.status == CreditReservationEntity.Status.CONFIRMED) {
                settle(grace, lot);
            }
        }
        return Optional.of(lot);
    }

    /**
     * Reserves a credit for a LIVE document: from the lot that expires first, else within the package's grace
     * margin. A credit note is never refused.
     *
     * @throws CreditRefused without a product, or with the grace margin used up
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public CreditReservationEntity reserve(UUID accountId, UUID documentId, DocumentType type, OffsetDateTime now) {
        lock(accountId);
        List<CreditGrantEntity> lots = CreditGrantEntity.lockAvailable(accountId, now);
        if (type != DocumentType.CREDIT_NOTE) {
            Optional<CreditRefused> refusal = refusal(accountId, lots, now);
            if (refusal.isPresent()) {
                refuse(accountId, refusal.get());
                CreditReservationEntity waived = reserveGrace(accountId, documentId);
                // Issued only because the credits were observed: no later lot pays for it.
                waived.settled = true;
                return waived;
            }
        }
        if (lots.isEmpty()) {
            return reserveGrace(accountId, documentId);
        }
        CreditGrantEntity lot = lots.getFirst();
        take(lot);
        CreditReservationEntity reservation =
                reservation(accountId, documentId, lot.id, CreditReservationEntity.Kind.CREDIT);
        move(
                accountId,
                lot.id,
                reservation.id,
                documentId,
                CreditMovementEntity.Type.RESERVE,
                -1,
                Actor.system(),
                null);
        return reservation;
    }

    /** Throws the refusal, or only logs it while observing. */
    public void refuse(UUID accountId, CreditRefused refusal) {
        if (enforce) {
            throw refusal;
        }
        LOG.warnf("Account %s would be refused (%s) if the credits were enforced", accountId, refusal.reason.code);
    }

    /**
     * Confirms the document's reservations once the DIAN accepts it; a grace one is settled if a lot has credits.
     * A reservation released while the document seemed dead (support resolved it as not issued, then a late attempt
     * got it accepted) is charged again: from the lot that expires first, else as grace the next lot settles.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public void confirm(UUID documentId, OffsetDateTime now) {
        List<CreditReservationEntity> reservations = CreditReservationEntity.listByDocument(documentId);
        if (reservations.isEmpty()) {
            return;
        }
        lock(reservations.getFirst().accountId);
        for (CreditReservationEntity reservation : reservations) {
            switch (reservation.status) {
                case RESERVED -> {
                    if (reservation.kind == CreditReservationEntity.Kind.GRACE && !reservation.settled) {
                        CreditGrantEntity.lockAvailable(reservation.accountId, now).stream()
                                .findFirst()
                                .ifPresent(lot -> settle(reservation, lot));
                    }
                }
                case RELEASED -> recharge(reservation, now);
                case CONFIRMED -> {
                    continue;
                }
            }
            reservation.status = CreditReservationEntity.Status.CONFIRMED;
            move(
                    reservation.accountId,
                    reservation.grantId,
                    reservation.id,
                    documentId,
                    CreditMovementEntity.Type.CONFIRM,
                    0,
                    Actor.system(),
                    null);
        }
    }

    /** Takes the released reservation's credit again, from the lot that expires first or as unsettled grace. */
    private void recharge(CreditReservationEntity reservation, OffsetDateTime now) {
        List<CreditGrantEntity> lots = CreditGrantEntity.lockAvailable(reservation.accountId, now);
        reservation.settled = false;
        if (lots.isEmpty()) {
            reservation.kind = CreditReservationEntity.Kind.GRACE;
            reservation.grantId = null;
        } else {
            CreditGrantEntity lot = lots.getFirst();
            take(lot);
            reservation.kind = CreditReservationEntity.Kind.CREDIT;
            reservation.grantId = lot.id;
        }
        move(
                reservation.accountId,
                reservation.grantId,
                reservation.id,
                reservation.documentId,
                CreditMovementEntity.Type.RESERVE,
                -reservation.quantity,
                Actor.system(),
                "Aceptado por la DIAN después de liberarse");
    }

    /**
     * Gives back what the document reserved when it was not issued. A credit goes back to its lot, and expires at
     * once if the lot already did (a lot past its date the daily expiry has not reached yet gets it back and
     * expires with it); a grace document is neither settled nor billed.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public void release(UUID documentId, Actor actor, String reason) {
        for (CreditReservationEntity reservation : reserved(documentId)) {
            reservation.status = CreditReservationEntity.Status.RELEASED;
            if (reservation.grantId == null) {
                move(
                        reservation.accountId,
                        null,
                        reservation.id,
                        documentId,
                        CreditMovementEntity.Type.RELEASE,
                        reservation.quantity,
                        actor,
                        reason);
                continue;
            }
            CreditGrantEntity lot = CreditGrantEntity.lock(reservation.grantId).orElseThrow();
            move(
                    lot.accountId,
                    lot.id,
                    reservation.id,
                    documentId,
                    CreditMovementEntity.Type.RELEASE,
                    reservation.quantity,
                    actor,
                    reason);
            switch (lot.status) {
                case ACTIVE, EXHAUSTED -> {
                    lot.remaining += reservation.quantity;
                    lot.status = CreditGrantEntity.Status.ACTIVE;
                }
                case EXPIRED, REVOKED -> {
                    CreditMovementEntity.Type gone = lot.status == CreditGrantEntity.Status.REVOKED
                            ? CreditMovementEntity.Type.REVOKE
                            : CreditMovementEntity.Type.EXPIRE;
                    move(lot.accountId, lot.id, reservation.id, documentId, gone, -reservation.quantity, actor, reason);
                }
            }
        }
    }

    /** Expires the account's lots past their date; what they had left is lost. */
    @Transactional(Transactional.TxType.MANDATORY)
    public int expire(UUID accountId, OffsetDateTime now) {
        lock(accountId);
        List<CreditGrantEntity> lots = CreditGrantEntity.lockExpired(accountId, now);
        for (CreditGrantEntity lot : lots) {
            if (lot.remaining > 0) {
                move(
                        accountId,
                        lot.id,
                        null,
                        null,
                        CreditMovementEntity.Type.EXPIRE,
                        -lot.remaining,
                        Actor.system(),
                        null);
                lot.remaining = 0;
            }
            lot.status = CreditGrantEntity.Status.EXPIRED;
        }
        return lots.size();
    }

    /**
     * A correction by a person: a positive quantity grants a lot without product until expiresAt, a negative one
     * takes credits from the lots first expiring first.
     *
     * @throws IllegalArgumentException when the lots have fewer credits than a negative quantity takes
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public void adjust(
            UUID accountId, int quantity, OffsetDateTime expiresAt, Actor actor, String reason, OffsetDateTime now) {
        if (quantity > 0) {
            grant(
                    accountId,
                    new Source(CreditGrantEntity.SourceType.ADJUSTMENT, Ids.newId()),
                    null,
                    quantity,
                    expiresAt,
                    actor,
                    reason);
            return;
        }
        lock(accountId);
        int pending = -quantity;
        List<CreditGrantEntity> lots = CreditGrantEntity.lockAvailable(accountId, now);
        if (lots.stream().mapToInt(lot -> lot.remaining).sum() < pending) {
            throw new IllegalArgumentException("The account has fewer than " + pending + " credits");
        }
        for (CreditGrantEntity lot : lots) {
            int taken = Math.min(pending, lot.remaining);
            if (taken == 0) {
                break;
            }
            lot.remaining -= taken;
            if (lot.remaining == 0) {
                lot.status = CreditGrantEntity.Status.EXHAUSTED;
            }
            move(accountId, lot.id, null, null, CreditMovementEntity.Type.ADJUST, -taken, actor, reason);
            pending -= taken;
        }
    }

    /**
     * @param available credits left in the lots that have not expired
     * @param granted credits the lots in force (active or exhausted, not expired) were granted with
     * @param grantLastId the newest lot in force; null without one
     * @param graceUsed grace documents not settled nor released, credit notes aside
     */
    public record Balance(
            int available, int granted, UUID grantLastId, int graceUsed, Entitlements.Entitlement entitlement) {}

    @Transactional(Transactional.TxType.MANDATORY)
    public Balance balance(UUID accountId, OffsetDateTime now) {
        Object[] totals = (Object[]) em.createNativeQuery("""
                        SELECT coalesce(sum(remaining) FILTER (WHERE status = 'ACTIVE'), 0),
                               coalesce(sum(quantity), 0)
                        FROM billing.credit_grants
                        WHERE account_id = :account AND status IN ('ACTIVE', 'EXHAUSTED') AND expires_at > :now
                        """)
                .setParameter("account", accountId)
                .setParameter("now", now)
                .getSingleResult();
        @SuppressWarnings("unchecked")
        List<UUID> newest = em.createNativeQuery("""
                        SELECT id FROM billing.credit_grants
                        WHERE account_id = :account AND status IN ('ACTIVE', 'EXHAUSTED') AND expires_at > :now
                        ORDER BY created_at DESC, id DESC
                        LIMIT 1
                        """, UUID.class)
                .setParameter("account", accountId)
                .setParameter("now", now)
                .getResultList();
        return new Balance(
                ((Number) totals[0]).intValue(),
                ((Number) totals[1]).intValue(),
                newest.isEmpty() ? null : newest.getFirst(),
                graceUsed(accountId),
                entitlements.of(accountId, now));
    }

    private Optional<CreditRefused> refusal(UUID accountId, List<CreditGrantEntity> lots, OffsetDateTime now) {
        Entitlements.Entitlement entitlement = entitlements.of(accountId, now);
        if (!entitlement.product()) {
            return Optional.of(new CreditRefused(
                    CreditRefused.Reason.NO_ACTIVE_PRODUCT,
                    "The account has no active package; credit notes can still be issued"));
        }
        if (!lots.isEmpty()) {
            return Optional.empty();
        }
        if (graceUsed(accountId) >= entitlement.graceMargin()) {
            return Optional.of(new CreditRefused(
                    CreditRefused.Reason.INSUFFICIENT_CREDITS,
                    "The account used its credits and its grace margin of " + entitlement.graceMargin()
                            + " documents; credit notes can still be issued"));
        }
        return Optional.empty();
    }

    private int graceUsed(UUID accountId) {
        return ((Number) em.createNativeQuery("""
                                SELECT count(*) FROM billing.credit_reservations r
                                JOIN billing.documents d ON d.id = r.document_id
                                WHERE r.account_id = :account AND r.kind = 'GRACE' AND NOT r.settled
                                  AND r.status <> 'RELEASED' AND d.document_type <> 'CREDIT_NOTE'
                                """)
                        .setParameter("account", accountId)
                        .getSingleResult())
                .intValue();
    }

    private CreditReservationEntity reserveGrace(UUID accountId, UUID documentId) {
        CreditReservationEntity reservation =
                reservation(accountId, documentId, null, CreditReservationEntity.Kind.GRACE);
        move(accountId, null, reservation.id, documentId, CreditMovementEntity.Type.RESERVE, -1, Actor.system(), null);
        return reservation;
    }

    /** Pays a confirmed grace document with a credit of the lot. */
    private void settle(CreditReservationEntity grace, CreditGrantEntity lot) {
        take(lot);
        grace.settled = true;
        move(
                lot.accountId,
                lot.id,
                grace.id,
                grace.documentId,
                CreditMovementEntity.Type.SETTLE,
                -grace.quantity,
                Actor.system(),
                null);
    }

    private static void take(CreditGrantEntity lot) {
        if (lot.remaining <= 0) {
            throw new IllegalStateException("Lot " + lot.id + " has no credits left");
        }
        lot.remaining--;
        if (lot.remaining == 0) {
            lot.status = CreditGrantEntity.Status.EXHAUSTED;
        }
    }

    /** The document's reservations still waiting for a verdict, with the account locked. */
    private List<CreditReservationEntity> reserved(UUID documentId) {
        List<CreditReservationEntity> reservations = CreditReservationEntity.listByDocument(documentId);
        if (reservations.isEmpty()) {
            return List.of();
        }
        lock(reservations.getFirst().accountId);
        return reservations.stream()
                .filter(r -> r.status == CreditReservationEntity.Status.RESERVED)
                .toList();
    }

    private static CreditReservationEntity reservation(
            UUID accountId, UUID documentId, UUID grantId, CreditReservationEntity.Kind kind) {
        CreditReservationEntity reservation = new CreditReservationEntity();
        reservation.id = Ids.newId();
        reservation.accountId = accountId;
        reservation.documentId = documentId;
        reservation.grantId = grantId;
        reservation.kind = kind;
        reservation.quantity = 1;
        reservation.status = CreditReservationEntity.Status.RESERVED;
        reservation.persist();
        return reservation;
    }

    private static void move(
            UUID accountId,
            UUID grantId,
            UUID reservationId,
            UUID documentId,
            CreditMovementEntity.Type type,
            int quantity,
            Actor actor,
            String reason) {
        CreditMovementEntity movement = new CreditMovementEntity();
        movement.id = Ids.newId();
        movement.accountId = accountId;
        movement.grantId = grantId;
        movement.reservationId = reservationId;
        movement.documentId = documentId;
        movement.type = type;
        movement.quantity = quantity;
        movement.actorType = actor.type().name();
        movement.actorId = actor.id();
        movement.reason = reason;
        movement.persist();
    }

    private void lock(UUID accountId) {
        em.createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(:key, 0))")
                .setParameter("key", "credits:" + accountId)
                .getSingleResult();
    }
}
