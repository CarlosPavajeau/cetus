package com.cantte.cetus.payments;

/**
 * Money of an approved transaction to give back, all of it or part. {@code reference} is Cetus' own for the refund,
 * which the provider keeps with it.
 */
public record RefundRequest(String transactionId, long amountCents, String reason, String reference) {

    public RefundRequest {
        if (transactionId == null || transactionId.isBlank()) {
            throw new IllegalArgumentException("A refund needs the transaction it gives money back from");
        }
        if (amountCents <= 0) {
            throw new IllegalArgumentException("A refund needs a positive amount");
        }
        if (reference == null || reference.isBlank()) {
            throw new IllegalArgumentException("A refund needs a reference");
        }
    }
}
