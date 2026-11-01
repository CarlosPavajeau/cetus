package com.cantte.cetus.payments;

/**
 * A saved means of payment as the provider has it. Only an AVAILABLE source can be charged; a card is declined or
 * approved when it is charged, not when it is saved.
 */
public record PaymentSource(String id, Status status, String lastFour) {

    public enum Status {
        AVAILABLE,
        PENDING,
        DECLINED,
        ERROR,
        VOIDED
    }
}
