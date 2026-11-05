package com.cantte.cetus.credits;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.PromotionClaimEntity;
import com.cantte.cetus.persistence.entity.PromotionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The active promotion's courtesy lot: an account that never had a product gets it with its first production
 * issuer, while slots remain and the NIT never had one. Accounts already in production had their own lot (V37).
 */
@ApplicationScoped
public class Courtesy {

    static final String REASON = "Cortesía para empezar en producción";

    /** What the public pages show of the active promotion. */
    public record Offer(int slots, int slotsRemaining, int documents, int validityDays) {}

    /** The account's courtesy: the lot it was granted, or the one it would get with its first production issuer. */
    public sealed interface State {}

    /** The account may still get the lot: it never had a product and slots remain. Its NIT is checked then. */
    public record Offered(int documents, int validityDays) implements State {}

    public record Granted(CreditGrantEntity lot) implements State {}

    @Inject
    EntityManager em;

    @Inject
    CreditLedger ledger;

    @Transactional(Transactional.TxType.MANDATORY)
    public Optional<Offer> offer() {
        return PromotionEntity.findActive().map(promotion -> {
            PlanVersionEntity version = PlanVersionEntity.findById(promotion.planVersionId);
            long claims = PromotionClaimEntity.countByPromotion(promotion.id);
            int slotsRemaining = (int) Math.max(0, promotion.slots - claims);
            return new Offer(promotion.slots, slotsRemaining, version.documentsIncluded, promotion.validityDays);
        });
    }

    /**
     * Empty when the account cannot get the courtesy lot, or bought another product since it got it: the lot still
     * counts, it is only no longer worth telling apart.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public Optional<State> of(UUID accountId, OffsetDateTime at) {
        List<CreditGrantEntity> lots = CreditGrantEntity.<CreditGrantEntity>list(
                "accountId = ?1 and status in ?2 and expiresAt > ?3",
                accountId,
                List.of(CreditGrantEntity.Status.ACTIVE, CreditGrantEntity.Status.EXHAUSTED),
                at);
        Optional<CreditGrantEntity> lot = lots.stream()
                .filter(each -> each.sourceType == CreditGrantEntity.SourceType.PROMO
                        && PromotionClaimEntity.findByIdOptional(each.sourceId).isPresent())
                .findFirst();
        if (lot.isPresent()) {
            boolean alone = lots.size() == 1
                    && SubscriptionEntity.findCurrent(accountId).isEmpty();
            return alone ? Optional.of(new Granted(lot.get())) : Optional.empty();
        }
        return offer().filter(offer -> offer.slotsRemaining() > 0 && accountEligible(accountId))
                .map(offer -> new Offered(offer.documents(), offer.validityDays()));
    }

    /**
     * Takes a slot of the active promotion for the account and grants its lot, when the account and the NIT may
     * have one. Under the promotion's lock until the transaction ends.
     *
     * @return the lot, or empty when there is no slot for them
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public Optional<CreditGrantEntity> claim(UUID accountId, String nit, OffsetDateTime now) {
        Optional<PromotionEntity> active = PromotionEntity.lockActive();
        if (active.isEmpty()) {
            return Optional.empty();
        }
        PromotionEntity promotion = active.get();
        if (PromotionClaimEntity.countByPromotion(promotion.id) >= promotion.slots
                || !accountEligible(accountId)
                || PromotionClaimEntity.count("nit", nit) > 0) {
            return Optional.empty();
        }
        PromotionClaimEntity claim = new PromotionClaimEntity();
        claim.id = Ids.newId();
        claim.promotionId = promotion.id;
        claim.accountId = accountId;
        claim.nit = nit;
        claim.persist();
        PlanVersionEntity version = PlanVersionEntity.findById(promotion.planVersionId);
        CreditGrantEntity lot = ledger.grant(
                        accountId,
                        new CreditLedger.Source(CreditGrantEntity.SourceType.PROMO, claim.id),
                        version.id,
                        version.documentsIncluded,
                        now.plusDays(promotion.validityDays),
                        Actor.system(),
                        REASON)
                .orElseThrow(() -> new IllegalStateException("Promotion claim " + claim.id + " already had a lot"));
        return Optional.of(lot);
    }

    /** An account that never had a product, a production issuer nor a courtesy. */
    private boolean accountEligible(UUID accountId) {
        Object hadSomething =
                em.createNativeQuery("""
                        SELECT EXISTS (SELECT 1 FROM billing.credit_grants WHERE account_id = :account)
                            OR EXISTS (SELECT 1 FROM billing.subscriptions WHERE account_id = :account)
                            OR EXISTS (SELECT 1 FROM billing.issuers WHERE account_id = :account AND environment = 'LIVE')
                            OR EXISTS (SELECT 1 FROM billing.promotion_claims WHERE account_id = :account)
                        """).setParameter("account", accountId).getSingleResult();
        return !((Boolean) hadSomething);
    }
}
