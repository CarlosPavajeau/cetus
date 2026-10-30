package com.cantte.cetus.payments;

import java.net.URI;
import java.time.Instant;

/**
 * What to charge: the order's reference, its total in cents and the instant after which the checkout no longer
 * takes payments. The customer comes back to {@code redirectUrl}, which never confirms the payment.
 */
public record CheckoutRequest(String reference, long amountCents, String currency, Instant expiresAt, URI redirectUrl) {

    public CheckoutRequest {
        if (reference == null || reference.isBlank()) {
            throw new IllegalArgumentException("A checkout needs a reference");
        }
        if (amountCents <= 0) {
            throw new IllegalArgumentException("A checkout needs a positive amount");
        }
    }
}
