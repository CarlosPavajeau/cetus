package com.cantte.cetus.api.billing;

import com.cantte.cetus.api.billing.BillingViews.BillingProfileView;
import com.cantte.cetus.api.invoices.InvoiceRequest;
import com.cantte.cetus.api.invoices.InvoiceService;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.audit.RequestOrigin;
import com.cantte.cetus.persistence.entity.BillingProfileEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Who Cetus invoices for an account's purchases: validated like a customer of an invoice, since it becomes the
 * customer of Cetus' own invoice, and with an email to deliver it to.
 */
@ApplicationScoped
public class BillingProfiles {

    @Inject
    AuditLog auditLog;

    @Transactional(Transactional.TxType.MANDATORY)
    public BillingProfileView get(UUID accountId) {
        return Optional.<BillingProfileEntity>ofNullable(BillingProfileEntity.findById(accountId))
                .map(BillingProfileView::from)
                .orElseThrow(() -> new NotFoundException("The account has no billing profile yet"));
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public BillingProfileView save(UUID accountId, InvoiceRequest.Customer request, Actor actor, RequestOrigin origin) {
        Party party = InvoiceService.toParty(request);
        if (party.email() == null) {
            throw new DomainException(
                    "billing_profile_email_required", "The billing profile needs the email its invoices go to");
        }
        // A lock per account until the transaction ends, so two first saves do not both insert the profile.
        BillingProfileEntity.getEntityManager()
                .createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(:key, 0))")
                .setParameter("key", "billing-profile:" + accountId)
                .getSingleResult();
        BillingProfileEntity profile = BillingProfileEntity.findById(accountId);
        if (profile == null) {
            profile = new BillingProfileEntity();
            profile.accountId = accountId;
        }
        profile.assign(party);
        profile.persistAndFlush();
        auditLog.record(
                accountId,
                actor,
                origin,
                AuditAction.BILLING_PROFILE_UPDATED,
                "billing_profile",
                accountId,
                Map.of(
                        "identificationType", party.identificationType().name(),
                        "identificationNumber", party.identificationNumber(),
                        "legalName", party.legalName()));
        return BillingProfileView.from(profile);
    }
}
