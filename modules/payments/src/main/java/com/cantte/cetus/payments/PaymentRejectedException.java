package com.cantte.cetus.payments;

/** The provider refused the request (wrong key, invalid input) or answered something unreadable: do not retry. */
public class PaymentRejectedException extends PaymentException {

    public PaymentRejectedException(String message, Throwable cause) {
        super(message, cause);
    }
}
