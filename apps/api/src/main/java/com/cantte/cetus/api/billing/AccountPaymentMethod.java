package com.cantte.cetus.api.billing;

import com.cantte.cetus.api.billing.BillingViews.CardSetupView;
import com.cantte.cetus.api.billing.BillingViews.PaymentMethodView;
import com.cantte.cetus.api.billing.BillingViews.SavePaymentMethodRequest;
import com.cantte.cetus.api.billing.Orders.PaymentsUnavailable;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.payments.CardSourceRequest;
import com.cantte.cetus.payments.PaymentGateway;
import com.cantte.cetus.payments.PaymentRejectedException;
import com.cantte.cetus.payments.PaymentSource;
import com.cantte.cetus.payments.PaymentTransientException;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.audit.RequestOrigin;
import com.cantte.cetus.persistence.entity.BillingProfileEntity;
import com.cantte.cetus.persistence.entity.PaymentMethodEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * The card an account saves to pay its renewals. The browser tokenizes the card with Wompi and sends only the token,
 * with the terms the customer accepted; Wompi keeps the card as a payment source. Saving a card replaces the one
 * before; Wompi cannot void a card source, so a replaced or removed card is only never charged again.
 */
@ApplicationScoped
public class AccountPaymentMethod {

    private static final Logger LOG = Logger.getLogger(AccountPaymentMethod.class);

    @Inject
    PaymentClients payments;

    @Inject
    AuditLog auditLog;

    @Transactional(Transactional.TxType.MANDATORY)
    public PaymentMethodView of(UUID accountId) {
        return PaymentMethodEntity.findActive(accountId)
                .map(PaymentMethodView::from)
                .orElseThrow(() -> new NotFoundException("The account has no saved card"));
    }

    public CardSetupView setup() {
        PaymentGateway gateway = payments.gateway().orElseThrow(PaymentsUnavailable::new);
        try {
            return CardSetupView.from(gateway.cardSetup());
        } catch (PaymentTransientException | PaymentRejectedException e) {
            LOG.warnf("Wompi's terms could not be read: %s", e.getMessage());
            throw new GatewayUnavailable();
        }
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public PaymentMethodView save(UUID accountId, SavePaymentMethodRequest request, Actor actor, RequestOrigin origin) {
        PaymentGateway gateway = payments.gateway().orElseThrow(PaymentsUnavailable::new);
        BillingProfileEntity profile = BillingProfileEntity.findById(accountId);
        if (profile == null) {
            throw new DomainException(
                    "billing_profile_required", "Set who Cetus invoices for the account before saving a card");
        }
        PaymentSource source;
        try {
            source = gateway.saveCard(new CardSourceRequest(
                    request.cardToken(),
                    profile.party.email(),
                    request.acceptanceToken(),
                    request.personalDataAuthToken()));
        } catch (PaymentRejectedException e) {
            LOG.infof("Wompi refused a card of account %s: %s", accountId, e.getMessage());
            throw new DomainException("payment_method_declined", "Wompi did not accept the card");
        } catch (PaymentTransientException e) {
            LOG.warnf("Wompi could not save a card: %s", e.getMessage());
            throw new GatewayUnavailable();
        }
        if (source.status() != PaymentSource.Status.AVAILABLE) {
            throw new DomainException("payment_method_declined", "Wompi did not accept the card");
        }
        OffsetDateTime now = OffsetDateTime.now();
        PaymentMethodEntity.lockActive(accountId).ifPresent(previous -> remove(previous, now));
        // Before the new card is inserted: an account has one active card at most.
        PaymentMethodEntity.flush();
        PaymentMethodEntity method = new PaymentMethodEntity();
        method.id = Ids.newId();
        method.accountId = accountId;
        method.provider = PaymentMethodEntity.Provider.WOMPI;
        method.providerSourceId = source.id();
        method.type = PaymentMethodEntity.Type.CARD;
        method.brand = request.brand();
        method.lastFour = source.lastFour();
        method.expMonth = request.expMonth();
        method.expYear = request.expYear();
        method.customerEmail = profile.party.email();
        method.status = PaymentMethodEntity.Status.ACTIVE;
        method.persist();
        auditLog.record(
                accountId,
                actor,
                origin,
                AuditAction.PAYMENT_METHOD_SAVED,
                "payment_method",
                method.id,
                Map.of("card", method.label()));
        return PaymentMethodView.from(method);
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public void remove(UUID accountId, Actor actor, RequestOrigin origin) {
        PaymentMethodEntity method = PaymentMethodEntity.lockActive(accountId)
                .orElseThrow(() -> new NotFoundException("The account has no saved card"));
        remove(method, OffsetDateTime.now());
        auditLog.record(
                accountId,
                actor,
                origin,
                AuditAction.PAYMENT_METHOD_REMOVED,
                "payment_method",
                method.id,
                Map.of("card", method.label()));
    }

    private static void remove(PaymentMethodEntity method, OffsetDateTime now) {
        method.status = PaymentMethodEntity.Status.REMOVED;
        method.removedAt = now;
    }

    /** Wompi did not answer, or answered what cannot be read: the card was not saved. */
    public static class GatewayUnavailable extends WebApplicationException {

        GatewayUnavailable() {
            super(ProblemDetail.response(503, "payments_unavailable", "Wompi is not answering; try again later"));
        }
    }
}
