package com.cantte.cetus.api.billing;

import com.cantte.cetus.api.billing.BillingViews.CreatePlanRequest;
import com.cantte.cetus.api.billing.BillingViews.CreateVersionRequest;
import com.cantte.cetus.api.billing.BillingViews.PlanOfferView;
import com.cantte.cetus.api.billing.BillingViews.PlanVersionView;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.audit.RequestOrigin;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * The plans Cetus sells and the versions of their terms. A version is never edited: new terms start at their date
 * and close the version before them, so what a customer bought stays as it was. An unlisted plan (Socios) is
 * sold through private versions, one account each.
 */
@ApplicationScoped
public class PlanCatalog {

    private static final Comparator<PlanOfferView> CATALOG_ORDER = Comparator.comparing(PlanOfferView::kind)
            .thenComparing(
                    offer -> offer.version() == null ? 0 : offer.version().totalCents())
            .thenComparing(PlanOfferView::code);

    @Inject
    AuditLog auditLog;

    /**
     * What the account can see now: the listed plans with their public version, and the plans with a version made
     * for the account, which takes the place of the public one.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public List<PlanOfferView> offers(UUID accountId) {
        OffsetDateTime now = OffsetDateTime.now();
        return PlanEntity.<PlanEntity>list("active = true").stream()
                .flatMap(plan -> PlanVersionEntity.findCurrent(plan.id, accountId, now)
                        .or(() -> plan.listed ? PlanVersionEntity.findCurrent(plan.id, null, now) : Optional.empty())
                        .map(version -> PlanOfferView.from(plan, PlanVersionView.from(version)))
                        .stream())
                .sorted(CATALOG_ORDER)
                .toList();
    }

    /** Every plan, sold or retired, with its public version now. */
    @Transactional(Transactional.TxType.MANDATORY)
    public List<PlanOfferView> all() {
        OffsetDateTime now = OffsetDateTime.now();
        return PlanEntity.<PlanEntity>listAll().stream()
                .map(plan -> PlanOfferView.from(
                        plan,
                        PlanVersionEntity.findCurrent(plan.id, null, now)
                                .map(PlanVersionView::from)
                                .orElse(null)))
                .sorted(CATALOG_ORDER)
                .toList();
    }

    /**
     * A plan without versions yet. It is never assigned as an account's plan: the subscriptions that are carry
     * their limits in a migration until subscriptions are sold (phase 6).
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public PlanOfferView create(CreatePlanRequest request, Actor actor, RequestOrigin origin) {
        boolean lasts = request.kind() != PlanEntity.Kind.SUBSCRIPTION;
        if (lasts != (request.validityMonths() != null)) {
            throw new DomainException(
                    "plan_validity_invalid", "A package or a top-up lasts some months; a subscription renews monthly");
        }
        if (request.requiresKind() != null && request.kind() != PlanEntity.Kind.TOPUP) {
            throw new DomainException("plan_requires_kind_invalid", "Only a top-up requires another product");
        }
        if (PlanEntity.findByCode(request.code()).isPresent()) {
            throw new DomainException("plan_exists", "There is already a plan " + request.code());
        }
        PlanEntity plan = new PlanEntity();
        plan.id = Ids.newId();
        plan.code = request.code();
        plan.name = request.name().strip();
        plan.kind = request.kind();
        plan.validityMonths = request.validityMonths();
        plan.requiresKind = request.requiresKind();
        plan.listed = request.listed();
        plan.assignable = false;
        plan.persist();
        Map<String, Object> data = new HashMap<>();
        data.put("plan", plan.code);
        data.put("name", plan.name);
        data.put("kind", plan.kind.name());
        data.put("validityMonths", plan.validityMonths);
        data.put("listed", plan.listed);
        auditLog.record(null, actor, origin, AuditAction.PLAN_CREATED, "plan", plan.id, data);
        return PlanOfferView.from(plan, null);
    }

    /** Every version of the plan, public and private, newest first. */
    @Transactional(Transactional.TxType.MANDATORY)
    public List<PlanVersionView> versions(UUID planId) {
        PlanEntity.<PlanEntity>findByIdOptional(planId).orElseThrow(() -> new NotFoundException("Plan not found"));
        return PlanVersionEntity.listByPlan(planId).stream()
                .map(PlanVersionView::from)
                .toList();
    }

    /**
     * The plan's next terms, from {@code validFrom} (now when null), for everyone or for one account. The plan is
     * locked so two versions cannot take the same number or close the same one.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public PlanVersionView addVersion(UUID planId, CreateVersionRequest request, Actor actor, RequestOrigin origin) {
        PlanEntity plan = PlanEntity.lock(planId).orElseThrow(() -> new NotFoundException("Plan not found"));
        requireTermsOfKind(plan, request);
        requireOwner(plan, request.accountId());
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime validFrom = request.validFrom() == null ? now : request.validFrom();
        if (validFrom.isBefore(now.minusMinutes(1))) {
            throw new DomainException("version_valid_from_past", "A version starts now or later, never in the past");
        }
        Optional<PlanVersionEntity> open = PlanVersionEntity.findOpen(plan.id, request.accountId());
        if (open.isPresent() && !validFrom.isAfter(open.get().validFrom)) {
            throw new DomainException(
                    "version_valid_from_before_current",
                    "The new version must start after version " + open.get().version + ", from "
                            + open.get().validFrom);
        }
        open.ifPresent(previous -> {
            previous.validTo = validFrom;
            // Closed before the new one is inserted: only one may be open per owner (uq_plan_versions_open).
            PlanVersionEntity.flush();
        });
        PlanVersionEntity version = new PlanVersionEntity();
        version.id = Ids.newId();
        version.planId = plan.id;
        version.version = PlanVersionEntity.versionNext(plan.id);
        version.accountId = request.accountId();
        version.priceCents = request.priceCents();
        version.taxIncluded = request.taxIncluded();
        version.taxRate = request.taxRate();
        version.documentsIncluded = request.documentsIncluded();
        version.issuersIncluded = request.issuersIncluded();
        version.priceOverageCents = request.priceOverageCents();
        version.validFrom = validFrom;
        version.persist();
        Map<String, Object> data = new HashMap<>();
        data.put("plan", plan.code);
        data.put("version", version.version);
        data.put("priceCents", version.priceCents);
        data.put("taxIncluded", version.taxIncluded);
        data.put("taxRate", version.taxRate.toPlainString());
        data.put("documentsIncluded", version.documentsIncluded);
        data.put("issuersIncluded", version.issuersIncluded);
        data.put("priceOverageCents", version.priceOverageCents);
        data.put("validFrom", version.validFrom.toString());
        auditLog.record(
                version.accountId, actor, origin, AuditAction.PLAN_VERSION_ADDED, "plan_version", version.id, data);
        return PlanVersionView.from(version);
    }

    /** A top-up never adds issuers; only a subscription has an overage price, and it always has one. */
    private static void requireTermsOfKind(PlanEntity plan, CreateVersionRequest request) {
        boolean topUp = plan.kind == PlanEntity.Kind.TOPUP;
        if (topUp != (request.issuersIncluded() == null)) {
            throw new DomainException(
                    "version_issuers_invalid", "A top-up includes no issuers; every other plan includes some");
        }
        boolean subscription = plan.kind == PlanEntity.Kind.SUBSCRIPTION;
        if (subscription != (request.priceOverageCents() != null)) {
            throw new DomainException(
                    "version_overage_invalid", "A subscription has an overage price; packages and top-ups have none");
        }
    }

    /** A listed plan has public versions only; an unlisted one, versions for one account each. */
    private static void requireOwner(PlanEntity plan, UUID accountId) {
        if (plan.listed && accountId != null) {
            throw new DomainException(
                    "version_private_listed",
                    "A listed plan is sold to everyone; private versions are for unlisted ones");
        }
        if (!plan.listed && accountId == null) {
            throw new DomainException(
                    "version_account_required", "An unlisted plan is sold through versions for one account");
        }
        if (accountId != null && AccountEntity.findById(accountId) == null) {
            throw new NotFoundException("Account not found");
        }
    }
}
