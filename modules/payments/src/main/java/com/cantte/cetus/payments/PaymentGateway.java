package com.cantte.cetus.payments;

import java.util.List;
import java.util.Optional;

/** A payment provider: signs checkouts, answers for a transaction and authenticates its events. */
public interface PaymentGateway {

    /** The signed parameters that open the provider's checkout for one order; makes no call. */
    Checkout checkout(CheckoutRequest request);

    /**
     * The transaction as the provider has it now, the only source of truth for a payment.
     *
     * @return empty when the provider does not know the id
     * @throws PaymentTransientException when the provider cannot be reached or fails; ask again later
     * @throws PaymentRejectedException when the provider refuses the request or answers what cannot be read
     */
    Optional<PaymentTransaction> transaction(String id);

    /**
     * Every transaction made for the reference (one per payment attempt), as the provider has them now.
     *
     * @throws PaymentTransientException when the provider cannot be reached or fails; ask again later
     * @throws PaymentRejectedException when the provider refuses the request or answers what cannot be read
     */
    List<PaymentTransaction> transactions(String reference);

    /** Checks an event's signature and environment; makes no call. */
    EventCheck verifyEvent(String body);
}
