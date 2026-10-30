package com.cantte.cetus.payments;

public enum PaymentStatus {
    PENDING,
    APPROVED,
    DECLINED,
    VOIDED,
    ERROR;

    /** Every status but PENDING is final: the provider does not move the transaction again on its own. */
    public boolean isFinal() {
        return this != PENDING;
    }
}
