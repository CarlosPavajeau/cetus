package com.cantte.cetus.payments;

/**
 * A charge to a saved source, without the customer. {@code reference} is the attempt's and can be used once: the
 * provider refuses a second transaction with it.
 */
public record ChargeRequest(
        String reference, long amountCents, String currency, String customerEmail, String sourceId) {

    public ChargeRequest {
        if (reference == null || reference.isBlank()) {
            throw new IllegalArgumentException("A charge needs a reference");
        }
        if (amountCents <= 0) {
            throw new IllegalArgumentException("A charge needs a positive amount");
        }
        if (sourceId == null || sourceId.isBlank()) {
            throw new IllegalArgumentException("A charge needs a source");
        }
    }
}
