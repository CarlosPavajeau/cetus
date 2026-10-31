package com.cantte.cetus.api.billing;

import com.cantte.cetus.api.billing.BillingViews.AccountCreditsView;
import com.cantte.cetus.api.billing.BillingViews.CreditLotView;
import com.cantte.cetus.api.billing.BillingViews.CreditMovementView;
import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.CreditMovementEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** An account's credits as its members see them: the balance, the lots and what moved them. */
@ApplicationScoped
public class AccountCredits {

    static final int MOVEMENTS_LIMIT = 50;

    @Inject
    CreditLedger ledger;

    @Transactional(Transactional.TxType.MANDATORY)
    public AccountCreditsView of(UUID accountId) {
        CreditLedger.Balance balance = ledger.balance(accountId, OffsetDateTime.now());
        List<CreditGrantEntity> lots = CreditGrantEntity.listByAccount(accountId);
        Map<UUID, PlanEntity> plans = plansByVersion(lots.stream()
                .map(lot -> lot.planVersionId)
                .filter(Objects::nonNull)
                .distinct()
                .toList());
        return new AccountCreditsView(
                balance.entitlement().product(),
                balance.available(),
                balance.granted(),
                balance.graceUsed(),
                balance.entitlement().graceMargin(),
                balance.entitlement().issuersIncluded(),
                IssuerEntity.count("accountId = ?1 and environment = ?2", accountId, Environment.LIVE),
                lots.stream()
                        .map(lot -> lot(lot, lot.planVersionId == null ? null : plans.get(lot.planVersionId)))
                        .toList(),
                CreditMovementEntity.listByAccount(accountId, MOVEMENTS_LIMIT).stream()
                        .map(CreditMovementView::from)
                        .toList());
    }

    /** The plan of each version, read in two queries whatever the number of versions. */
    private static Map<UUID, PlanEntity> plansByVersion(List<UUID> versionIds) {
        if (versionIds.isEmpty()) {
            return Map.of();
        }
        List<PlanVersionEntity> versions = PlanVersionEntity.list("id in ?1", versionIds);
        Map<UUID, PlanEntity> plans = PlanEntity.<PlanEntity>list(
                        "id in ?1",
                        versions.stream()
                                .map(version -> version.planId)
                                .distinct()
                                .toList())
                .stream()
                .collect(Collectors.toMap(plan -> plan.id, Function.identity()));
        return versions.stream().collect(Collectors.toMap(version -> version.id, version -> plans.get(version.planId)));
    }

    private static CreditLotView lot(CreditGrantEntity lot, PlanEntity plan) {
        return new CreditLotView(
                lot.id,
                plan == null ? null : plan.name,
                plan == null ? null : plan.kind,
                lot.sourceType,
                lot.quantity,
                lot.remaining,
                lot.expiresAt,
                lot.status,
                lot.createdAt);
    }
}
