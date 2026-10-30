package com.cantte.cetus.api.billing;

import com.cantte.cetus.api.billing.BillingViews.CreatePlanRequest;
import com.cantte.cetus.api.billing.BillingViews.CreatePriceRequest;
import com.cantte.cetus.api.billing.BillingViews.PlanOfferView;
import com.cantte.cetus.api.billing.BillingViews.PlanPriceView;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.audit.RequestOrigin;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanPriceEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The plans Cetus sells and their prices. A price is never edited: a new version starts at its date and closes
 * the one before, so what an order applied stays as it was.
 */
@ApplicationScoped
public class PlanCatalog {

    @Inject
    AuditLog auditLog;

    /** The plans on sale with a price now, cheapest first within each kind. */
    @Transactional(Transactional.TxType.MANDATORY)
    public List<PlanOfferView> offers() {
        OffsetDateTime now = OffsetDateTime.now();
        return PlanEntity.<PlanEntity>list("active = true").stream()
                .flatMap(plan -> PlanPriceEntity.findCurrent(plan.code, now).stream()
                        .map(price -> PlanOfferView.from(plan, PlanPriceView.from(price))))
                .sorted(Comparator.comparing(PlanOfferView::kind)
                        .thenComparing(offer -> offer.price().totalCents())
                        .thenComparing(PlanOfferView::code))
                .toList();
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public PlanOfferView create(CreatePlanRequest request, Actor actor, RequestOrigin origin) {
        if (request.kind() == PlanEntity.Kind.SUBSCRIPTION) {
            throw new DomainException(
                    "plan_kind_invalid",
                    "Subscriptions come with their limits in a migration; create a package or a top-up");
        }
        if (PlanEntity.findById(request.code()) != null) {
            throw new DomainException("plan_exists", "There is already a plan " + request.code());
        }
        PlanEntity plan = new PlanEntity();
        plan.code = request.code();
        plan.name = request.name().strip();
        plan.kind = request.kind();
        plan.documentsIncluded = request.documentsIncluded();
        plan.validityMonths = request.validityMonths();
        plan.assignable = false;
        plan.persist();
        auditLog.record(
                null,
                actor,
                origin,
                AuditAction.PLAN_CREATED,
                "plan",
                null,
                Map.of(
                        "plan", plan.code,
                        "name", plan.name,
                        "kind", plan.kind.name(),
                        "documentsIncluded", plan.documentsIncluded,
                        "validityMonths", plan.validityMonths));
        return PlanOfferView.from(plan, null);
    }

    /** Every version of the plan's price, newest first. */
    @Transactional(Transactional.TxType.MANDATORY)
    public List<PlanPriceView> prices(String code) {
        plan(code);
        return PlanPriceEntity.listByPlan(code).stream()
                .map(PlanPriceView::from)
                .toList();
    }

    /**
     * The plan's next price, from {@code validFrom} (now when null). The plan is locked so two versions cannot
     * both close the same one.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public PlanPriceView addPrice(String code, CreatePriceRequest request, Actor actor, RequestOrigin origin) {
        PlanEntity plan =
                Optional.ofNullable(PlanEntity.lock(code)).orElseThrow(() -> new NotFoundException("Plan not found"));
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime validFrom = request.validFrom() == null ? now : request.validFrom();
        if (validFrom.isBefore(now.minusMinutes(1))) {
            throw new DomainException("price_valid_from_past", "A price starts now or later, never in the past");
        }
        Optional<PlanPriceEntity> open = PlanPriceEntity.findOpen(plan.code);
        if (open.isPresent() && !validFrom.isAfter(open.get().validFrom)) {
            throw new DomainException(
                    "price_valid_from_before_current",
                    "The new price must start after version " + open.get().version + ", from " + open.get().validFrom);
        }
        open.ifPresent(previous -> {
            previous.validTo = validFrom;
            // The open one closes before the new one is inserted: only one may be open (uq_plan_prices_open).
            PlanPriceEntity.flush();
        });
        PlanPriceEntity price = new PlanPriceEntity();
        price.id = Ids.newId();
        price.planCode = plan.code;
        price.version = open.map(previous -> previous.version + 1).orElse(1);
        price.amountCents = request.amountCents();
        price.currency = "COP";
        price.taxRate = request.taxRate();
        price.validFrom = validFrom;
        price.persist();
        auditLog.record(
                null,
                actor,
                origin,
                AuditAction.PLAN_PRICE_ADDED,
                "plan_price",
                price.id,
                Map.of(
                        "plan", plan.code,
                        "version", price.version,
                        "amountCents", price.amountCents,
                        "taxRate", price.taxRate.toPlainString(),
                        "validFrom", price.validFrom.toString()));
        return PlanPriceView.from(price);
    }

    private static PlanEntity plan(String code) {
        return Optional.<PlanEntity>ofNullable(PlanEntity.findById(code))
                .orElseThrow(() -> new NotFoundException("Plan not found"));
    }
}
