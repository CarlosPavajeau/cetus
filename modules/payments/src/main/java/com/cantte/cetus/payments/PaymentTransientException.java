package com.cantte.cetus.payments;

/** Network error, timeout, rate limit or provider failure (5xx): the same request may be retried later. */
public class PaymentTransientException extends PaymentException {

    public PaymentTransientException(String message, Throwable cause) {
        super(message, cause);
    }
}
