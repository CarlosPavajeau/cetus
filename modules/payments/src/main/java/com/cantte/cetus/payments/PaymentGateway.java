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

    /**
     * What the browser needs to tokenize a card, with the terms in force to accept.
     *
     * @throws PaymentTransientException when the provider cannot be reached or fails; ask again later
     * @throws PaymentRejectedException when the provider refuses the request or answers what cannot be read
     */
    CardSetup cardSetup();

    /**
     * Saves a tokenized card to charge it later. A card the issuer would decline is still saved: it is declined
     * when charged.
     *
     * @throws PaymentTransientException when the provider cannot be reached or fails; ask again later
     * @throws PaymentRejectedException when the provider refuses the token, the terms or the request
     */
    PaymentSource saveCard(CardSourceRequest request);

    /**
     * Charges a saved source, accepting the terms in force on the customer's behalf as they accepted when saving it.
     * The transaction usually comes back PENDING; its outcome arrives like any other's.
     *
     * @throws PaymentTransientException when the provider cannot be reached or fails; the charge may have been
     *     made, so look for the reference's transactions before charging again
     * @throws PaymentRejectedException when the provider refuses the charge, such as a reference already used
     */
    PaymentTransaction charge(ChargeRequest request);

    /**
     * Gives money of an approved transaction back, all of it or part.
     *
     * @throws PaymentTransientException when the provider cannot be reached or fails; the refund may have been made,
     *     so a person checks before asking again
     * @throws PaymentRejectedException when the provider refuses the refund: it was not made
     */
    Refund refund(RefundRequest request);

    /**
     * A refund as the provider has it now, to learn how one answered PENDING ended.
     *
     * @return empty when the provider does not know the id
     * @throws PaymentTransientException when the provider cannot be reached or fails; ask again later
     * @throws PaymentRejectedException when the provider refuses the request or answers what cannot be read
     */
    Optional<Refund> refundOf(String id);
}
